import pandas as pd
from tensorflow import keras
import numpy as np
from sklearn.preprocessing import PowerTransformer, RobustScaler
import joblib # Se usa para cargar los transformadores
import os, json
import numpy as np
import pandas as pd
from typing import Optional, Dict
from sklearn.preprocessing import PowerTransformer, RobustScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
from tensorflow import keras
import tensorflow as tf
import joblib
# Rutas de los archivos
MODEL_PATH = 'app/api/modelo_florecimiento.keras'
PT_X_PATH = 'app/api/pt_x.save'
PT_Y_PATH = 'app/api/pt_y.save'

# Columnas usadas en el entrenamiento
COLS_X = [
    'NDVI', 'EVI', 'LST_day', 'LST_night', 'precip_7d', 'precip_15d', 'precip_30d', 'precip_60d', 'precip_90d',
    'LST_range', 'LST_mean', 'NDVI_EVI_ratio', 'year', 'month', 'day_of_year', 'thermal_stress', 'NDVI_change',
    'NDVI_rolling_mean_30d', 'ET_estimate', 'water_balance_7d', 'water_balance_15d', 'water_balance_30d',
    'water_balance_60d', 'water_balance_90d'
]

# Cargar modelo y transformadores (lazy loading)
pt_x = None
pt_y = None

def _load_transformers():
    """Carga los transformadores si existen"""
    global pt_x, pt_y
    if pt_x is None and os.path.exists(PT_X_PATH):
        pt_x = joblib.load(PT_X_PATH)
    if pt_y is None and os.path.exists(PT_Y_PATH):
        pt_y = joblib.load(PT_Y_PATH)
    return pt_x is not None and pt_y is not None

# --------------------------------------------------------------------------------

def predict_flowering_days(input_dict: dict,file_path:str = "app/api/modelo_florecimiento.keras") -> float:
    """
    Recibe un diccionario con las columnas de entrada y devuelve la predicción de días hasta la floración.
    """
    # Verificar que los transformadores estén cargados
    if not _load_transformers():
        raise FileNotFoundError("Model transformers not found. Please train the model first.")
    
    # Verificar que el modelo existe
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Model file not found: {file_path}")
    
    model = keras.models.load_model(file_path)

    # Verificar columnas
    missing = [col for col in COLS_X if col not in input_dict]
    if missing:
        raise ValueError(f"Faltan columnas: {missing}")
    # Crear DataFrame
    X_df = pd.DataFrame([input_dict])[COLS_X]
    # Transformar X
    X_trans = pt_x.transform(X_df)
    # Predecir
    y_pred_trans = model.predict(X_trans)
    # Inversa de la transformación de y
    y_pred = pt_y.inverse_transform(y_pred_trans.reshape(-1, 1)).flatten()[0]
    return float(y_pred)



def entrenar_modelo_floracion(
    demo_mode: bool = True,
    path_features_base: str = "datos_nuevos_multi.csv",
    features_nuevos:dict = [],
    path_fechas: str = "fechas_floracion.csv",
    seed: int = 42,
    epochs: int = 200,
    batch_size: int = 32,
) -> Dict:
    """
    Entrena un modelo (DEMO o REAL) para predecir 'days_to_flowering' y guarda:
      - Modelo Keras (.keras)
      - Preprocesadores pt_x/robust/pt_y (.joblib)
      - Columnas X (x_cols.json)

    Returns: dict con métricas y rutas guardadas.
    """

    # -------------------- Config locales --------------------
    EXCLUDED = ['date','flowering_date','timestamp','parcel_id','days_to_flowering','season']
    CYCLIC = ['day_sin','day_cos']

    # Semillas
    np.random.seed(seed)
    tf.random.set_seed(seed)

    # -------------------- Helpers internos --------------------
    def cargar_features() -> pd.DataFrame:
        if not os.path.exists(path_features_base):
            raise FileNotFoundError(f"No se encontró: {path_features_base}")
        df = pd.read_csv(path_features_base)
        df_new = pd.DataFrame(features_nuevos)
        df = pd.concat([df, df_new], ignore_index=True)
        return df

    

    def preparar_con_fechas_reales(df_feat: pd.DataFrame, df_fechas: pd.DataFrame) -> pd.DataFrame:
        df = df_feat.copy()
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df_fechas = df_fechas.copy()
        df_fechas['flowering_date'] = pd.to_datetime(df_fechas['flowering_date'], errors='coerce')
        comb = pd.merge(df, df_fechas, on='parcel_id', how='left')
        comb = comb.dropna(subset=['date','flowering_date'])
        comb = comb[comb['date'] < comb['flowering_date']].copy()
        comb['days_to_flowering'] = (comb['flowering_date'] - comb['date']).dt.days
        return comb

    def build_model(nf: int, lr: float = 5e-4) -> keras.Model:
        m = keras.Sequential([
            keras.layers.Input(shape=(nf,)),
            keras.layers.Dense(128, activation='relu', kernel_regularizer=keras.regularizers.l2(1e-3)),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(64, activation='relu', kernel_regularizer=keras.regularizers.l2(1e-3)),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(1, activation='linear')
        ])
        m.compile(optimizer=keras.optimizers.Adam(lr), loss='mse', metrics=['mae'])
        return m

    # -------------------- Carga y etiquetas --------------------
    df_feat = cargar_features()

    usar_reales = (not demo_mode) and os.path.exists(path_fechas)
    if usar_reales:
        print("🟢 Entrenando con FECHAS REALES.")
        df_fechas = pd.read_csv(path_fechas)
        df = preparar_con_fechas_reales(df_feat, df_fechas)
        suf = ""  # nombres 'productivos'
    

    # -------------------- X / y y prepro --------------------
    X_cols = [c for c in df.columns if c not in EXCLUDED and pd.api.types.is_numeric_dtype(df[c])]
    if len(X_cols) == 0:
        raise ValueError("No hay columnas numéricas para entrenar. Revisa tu dataset.")

    Y = df['days_to_flowering'].values.reshape(-1,1)

    pt_x = PowerTransformer(method='yeo-johnson', standardize=True)
    robust = RobustScaler()
    cols_pt = [c for c in X_cols if c not in CYCLIC]
    cyc = [c for c in CYCLIC if c in X_cols]

    X = df[X_cols].copy()
    if cols_pt:
        pt_x.fit(X[cols_pt]); X[cols_pt] = pt_x.transform(X[cols_pt])
    if cyc:
        robust.fit(X[cyc]); X[cyc] = robust.transform(X[cyc])

    pt_y = PowerTransformer(method='yeo-johnson', standardize=True)
    pt_y.fit(Y); y_t = pt_y.transform(Y).flatten()

    X = np.nan_to_num(X.values, nan=0.0, posinf=1e5, neginf=-1e5)

    # -------------------- Split / modelo / training --------------------
    X_tr, X_te, y_tr, y_te = train_test_split(X, y_t, test_size=0.2, random_state=seed, shuffle=True)

    model = build_model(X_tr.shape[1], lr=5e-4)
    callbacks = [
        keras.callbacks.EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6)
    ]

    print("🚀 Entrenando...")
    hist = model.fit(X_tr, y_tr, validation_data=(X_te, y_te), epochs=epochs, batch_size=batch_size,
                     callbacks=callbacks, verbose=1)

    # -------------------- Métricas (escala original: días) --------------------
    y_pred_t = model.predict(X_te).flatten()
    y_te_days = pt_y.inverse_transform(y_te.reshape(-1,1)).flatten()
    y_pred_days = pt_y.inverse_transform(y_pred_t.reshape(-1,1)).flatten()
    r2 = float(r2_score(y_te_days, y_pred_days))
    mae_days = float(mean_absolute_error(y_te_days, y_pred_days))
    print(f"R2:  {r2:.4f}")
    print(f"MAE: {mae_days:.2f} días")

    # -------------------- Guardados --------------------
    modelo_path = f"modelo_florecimiento{suf}.keras"
    pt_x_path   = f"pt_x{suf}.joblib"
    robust_path = f"robust_scaler{suf}.joblib"
    pt_y_path   = f"pt_y{suf}.joblib"
    xcols_path  = f"x_cols{suf}.json"

    model.save(modelo_path)
    joblib.dump(pt_x, pt_x_path)
    joblib.dump(robust, robust_path)
    joblib.dump(pt_y, pt_y_path)
    with open(xcols_path,'w', encoding="utf-8") as f:
        json.dump(X_cols, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Guardado modelo en: {modelo_path}")
    print(f"✅ Preprocesadores en: {pt_x_path}, {robust_path}, {pt_y_path}")
    print(f"✅ Columnas X en: {xcols_path}")

    return "trained new model"