with open(r'c:\Private\Dev\Misturador\firmware\sima_esp32\src\main.cpp', 'rb') as f:
    raw = f.read()

# =================================================================
# Fix 1: Replace misplaced getCurrentStepName() DEFINITION in the
#         prototypes section with just a declaration
# =================================================================
old_def_in_proto = (
    b'const char* getCurrentStepName() {\r\n'
    b'  switch (currentState) {\r\n'
    b'    case STEP0_CHECK:   return "Verificacao Inicial";\r\n'
    b'    case STEP1_LIQUID1: return "1a Injecao de Liquido";\r\n'
    b'    case STEP2_POWDER:  return "Adicao de Po";\r\n'
    b'    case STEP3_LIQUID2: return "2a Injecao de Liquido";\r\n'
    b'    case STEP4_MIX:     return "Agitacao";\r\n'
    b'    case STEP5_EXTRACT: return "Extracao";\r\n'
    b'    case STEP6_SERVE:   return "Servindo no Copo";\r\n'
    b'    case STEP7_DONE:    return "Finalizado";\r\n'
    b'    case STOPPED:       return "Parado";\r\n'
    b'    case ERROR_STATE:   return "Em Erro";\r\n'
    b'    default:            return "Ocioso";\r\n'
    b'  }\r\n'
    b'}\r\n'
    b'\r\n'
    b'// ====\r\n'
    b'// LOOP'
)
new_proto = (
    b'const char* getCurrentStepName();\r\n'
    b'void startMotorRamp(uint8_t targetDuty);\r\n'
    b'void stopMotor();\r\n'
    b'void updateMotorRamp();\r\n'
    b'void updateS5Pulse();\r\n'
    b'\r\n'
    b'// ====\r\n'
    b'// LOOP'
)
if old_def_in_proto in raw:
    raw = raw.replace(old_def_in_proto, new_proto)
    print('OK Fix 1: prototype section corrected')
else:
    # Try alternate — find the block more flexibly
    idx1 = raw.find(b'const char* getCurrentStepName() {\r\n  switch (currentState)')
    if idx1 != -1:
        # find end of this definition
        idx_end = raw.find(b'}\r\n\r\n// ====\r\n// LOOP', idx1)
        idx_end += len(b'}\r\n')
        raw = (raw[:idx1]
               + b'const char* getCurrentStepName();\r\nvoid startMotorRamp(uint8_t targetDuty);\r\nvoid stopMotor();\r\nvoid updateMotorRamp();\r\nvoid updateS5Pulse();\r\n'
               + raw[idx_end:])
        print('OK Fix 1 (alt): prototype section corrected')
    else:
        print('MISS Fix 1')

# =================================================================
# Fix 2: Add missing closing } for runProcess()
#         The switch ends fine but runProcess() itself is not closed
# =================================================================
old_run_end = (
    b'    default:\r\n'
    b'      break;\r\n'
    b'  }\r\n'
    b'\r\n'
    b'/**\r\n'
    b' * @brief Realiza'
)
new_run_end = (
    b'    default:\r\n'
    b'      break;\r\n'
    b'  }\r\n'
    b'}\r\n'
    b'\r\n'
    b'/**\r\n'
    b' * @brief Realiza'
)
if old_run_end in raw:
    raw = raw.replace(old_run_end, new_run_end)
    print('OK Fix 2: runProcess closing } added')
else:
    print('MISS Fix 2')

# =================================================================
# Fix 3: Rebuild changeState() with exit switch + transition + entry
#         Current state: only has entry switch, missing exit + transition
# =================================================================
old_change = (
    b'void changeState(ProcessState newState) {\r\n'
    b'  // --- Acoes de ENTRADA do novo estado ---\r\n'
    b'  switch (newState) {\r\n'
    b'    case STEP0_CHECK:\r\n'
    b'      publishEvent("Etapa 0: Verificando sensor de nivel...");\r\n'
    b'      if (readLevelSensor() == LOW) { publishEvent("ERRO: Reservatorio cheio. Abortado."); changeState(ERROR_STATE); }\r\n'
    b'      else { changeState(STEP1_LIQUID1); }\r\n'
    b'      break;\r\n'
    b'    case STEP1_LIQUID1: digitalWrite(PIN_RELAY_S2, RELAY_ON); break;\r\n'
    b'    case STEP3_LIQUID2: digitalWrite(PIN_RELAY_S2, RELAY_ON); break;\r\n'
    b'    case STEP2_POWDER:\r\n'
    b'    case STEP4_MIX:\r\n'
    b'    case STEP5_EXTRACT:\r\n'
    b'    case STEP6_SERVE:\r\n'
    b'      break;\r\n'
    b'    case STEP7_DONE:\r\n'
    b'      publishEvent("Processo finalizado com sucesso!");\r\n'
    b'      publishStatus("idle", 7, "Finalizado");\r\n'
    b'      changeState(IDLE);\r\n'
    b'      break;\r\n'
    b'    case IDLE:\r\n'
    b'    case STOPPED:\r\n'
    b'    case ERROR_STATE:\r\n'
    b'      stopAll();\r\n'
    b'      break;\r\n'
    b'    default: break;\r\n'
    b'  }\r\n'
    b'}}'
)
new_change = (
    b'void changeState(ProcessState newState) {\r\n'
    b'  // --- Acoes de SAIDA do estado antigo ---\r\n'
    b'  switch (currentState) {\r\n'
    b'    case STEP1_LIQUID1: digitalWrite(PIN_RELAY_S2, RELAY_OFF); publishEvent("Etapa 1: 1a injecao concluida"); break;\r\n'
    b'    case STEP2_POWDER:  digitalWrite(PIN_RELAY_S5, RELAY_OFF); publishEvent("Etapa 2: Po inserido"); break;\r\n'
    b'    case STEP3_LIQUID2: digitalWrite(PIN_RELAY_S2, RELAY_OFF); publishEvent("Etapa 3: 2a injecao concluida"); break;\r\n'
    b'    case STEP4_MIX:     stopMotor(); publishEvent("Etapa 4: Agitacao concluida"); break;\r\n'
    b'    case STEP5_EXTRACT: digitalWrite(PIN_RELAY_S4, RELAY_OFF); publishEvent("Etapa 5: Extracao concluida"); break;\r\n'
    b'    case STEP6_SERVE:\r\n'
    b'      digitalWrite(PIN_RELAY_S1, RELAY_OFF);\r\n'
    b'      digitalWrite(PIN_RELAY_S3, RELAY_OFF);\r\n'
    b'      publishEvent("Etapa 6: Servido ao usuario");\r\n'
    b'      break;\r\n'
    b'    default: break;\r\n'
    b'  }\r\n'
    b'\r\n'
    b'  // --- Transicao ---\r\n'
    b'  currentState = newState;\r\n'
    b'  stepStartTime = millis();\r\n'
    b'  if (newState != IDLE) {\r\n'
    b'    publishStatus(getStatusString(), getCurrentStepNum(), getCurrentStepName());\r\n'
    b'  }\r\n'
    b'\r\n'
    b'  // --- Acoes de ENTRADA do novo estado ---\r\n'
    b'  switch (newState) {\r\n'
    b'    case STEP0_CHECK:\r\n'
    b'      publishEvent("Etapa 0: Verificando sensor de nivel...");\r\n'
    b'      if (readLevelSensor() == LOW) { publishEvent("ERRO: Reservatorio cheio. Abortado."); changeState(ERROR_STATE); }\r\n'
    b'      else { changeState(STEP1_LIQUID1); }\r\n'
    b'      break;\r\n'
    b'    case STEP1_LIQUID1: digitalWrite(PIN_RELAY_S2, RELAY_ON); break;\r\n'
    b'    case STEP3_LIQUID2: digitalWrite(PIN_RELAY_S2, RELAY_ON); break;\r\n'
    b'    case STEP2_POWDER:\r\n'
    b'    case STEP4_MIX:\r\n'
    b'    case STEP5_EXTRACT:\r\n'
    b'    case STEP6_SERVE:\r\n'
    b'      break;\r\n'
    b'    case STEP7_DONE:\r\n'
    b'      publishEvent("Processo finalizado com sucesso!");\r\n'
    b'      publishStatus("idle", 7, "Finalizado");\r\n'
    b'      changeState(IDLE);\r\n'
    b'      break;\r\n'
    b'    case IDLE:\r\n'
    b'    case STOPPED:\r\n'
    b'    case ERROR_STATE:\r\n'
    b'      stopAll();\r\n'
    b'      break;\r\n'
    b'    default: break;\r\n'
    b'  }\r\n'
    b'}'
)
if old_change in raw:
    raw = raw.replace(old_change, new_change)
    print('OK Fix 3: changeState rebuilt')
else:
    print('MISS Fix 3')

# =================================================================
# Fix 4: Remove duplicate getCurrentStepName at the bottom
# =================================================================
old_dup = (
    b'const char* getCurrentStepName() {\r\n'
    b'  switch (currentState) {\r\n'
    b'    case STEP0_CHECK: return "Verificacao Inicial";\r\n'
    b'    case STEP1_LIQUID1: return "Entrada de liquido";\r\n'
)
idx_dup = raw.find(old_dup)
if idx_dup != -1:
    end_dup = raw.find(b'}\r\n', idx_dup) + 3
    raw = raw[:idx_dup] + raw[end_dup:]
    print('OK Fix 4: duplicate getCurrentStepName removed')
else:
    # Try alternate ending
    old_dup2 = b'const char* getCurrentStepName() {\r\n  switch (currentState) {\r\n    case STEP0_CHECK: return "Verificacao Inicial";'
    idx_dup2 = raw.find(old_dup2)
    if idx_dup2 != -1:
        end_dup2 = raw.find(b'}\r\n', idx_dup2) + 3
        raw = raw[:idx_dup2] + raw[end_dup2:]
        print('OK Fix 4 (alt): duplicate getCurrentStepName removed')
    else:
        print('MISS Fix 4')

with open(r'c:\Private\Dev\Misturador\firmware\sima_esp32\src\main.cpp', 'wb') as f:
    f.write(raw)
print('Firmware gravado.')
