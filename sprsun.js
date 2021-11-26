const m = require('modbus-serial')

const knownDI = {
	0: {name: 'unitOn'},
	1: {name: 'InputsCheck.FlwSw_Din'},
	2: {name: 'InputsCheck.RemoteOnOff_Din'},
	3: {name: 'InputsCheck.Terminal_Switch_Din'},
	4: {name: 'InputsCheck.ProtSeqPh_Din'},
	5: {name: 'Outputs.DoutVal_1'},
	6: {name: 'Outputs.DoutVal_2-running'},
	7: {name: 'Outputs.DoutVal_3-defrost maybe'},
	8: {name: 'Outputs.DoutVal_4-pump'},
	9: {name: 'Outputs.DoutVal_5'},
	10: {name: 'Outputs.DoutVal_6'},
	11: {name: 'Outputs.DoutVal_7'},
	12: {name: 'Outputs.DoutVal_8'},
	178: {name: 'unknown-di-178-pump-related'},
	179: {name: 'unknown-di-179-fan-related'},
	180: {name: 'unknown-di-180-rotor-related'},
	237: {name: 'unknown-di-237-defrost'},
}

const knownCoils = {
	0: {name: 'En_AuxHeat'},
	1: {name: 'En_Customer_16'},
	2: {name: 'OnOffUnitMng.UnitTypAfterPwrOff'},
	38: {name: 'En_SchedOnOff'},
	39: {name: 'En_Sch_Setp'},
	40: {name: 'OnOffUnitMng.KeybOnOff'},
}

const knownRegs = {
	0: {
		name: 'CoolHeat_Mode',
		enum: [
			'cooling',
			'heating',
			'hot water',
			'hot water + cooling',
			'hot water + heating',
		],
	},
	1: {name: 'HeatSetP', real: true},
	2: {name: 'CoolSetP', real: true},
	3: {name: 'W_TankSetP', real: true},
	4: {name: 'hotwater_start_diff', real: true},
	5: {name: 'hotwater_constant', real: true},
	6: {name: 'Temp_Diff', real: true},
	7: {name: 'Stop_TemP_Diff', real: true},
	8: {name: 'Kp', real: true},
	9: {name: 'Ti', min: 0, max: 9999},
	10: {name: 'Td', min: 0, max: 9999},
	11: {name: 'PmpMode', enum: ['normal', 'demand', 'interval']},
	12: {name: 'FanMode_Sel', enum: ['daytime', 'nighttime', 'eco', 'pressure']},
	13: {name: 'DT_AuxComp', min: 0, max: 999},
	14: {name: 'AuxHeatSetP_Exterior', real: true},
	15: {name: 'PmpDeltaTempSetP', real: true},
	19: {name: 'unknown-reg-19 600-700'}, // seen 780 once

	182: {name: 'GeneralMng.YearIn', min: 0, max: 99},
	183: {name: 'GeneralMng.MonthIn', min: 0, max: 12},
	184: {name: 'GeneralMng.DayIn', min: 0, max: 31},
	185: {name: 'GeneralMng.HourIn', min: 0, max: 23},
	186: {name: 'GeneralMng.MinuteIn', min: 0, max: 59},
	187: {name: 'GeneralMng.DayOfWeek', min: 0, max: 7},
	188: {name: 'CW_InTemp', real: true},
	189: {name: 'CW_OutTemp', real: true},
	190: {name: 'AmbTemp', real: true},
	191: {name: 'DscgTemp', real: true},
	192: {name: 'SuctTemp', real: true},
	193: {name: 'DscgP', real: true},
	194: {name: 'SuctP', real: true},
	195: {name: 'CW_TankTemp', real: true},
	196: {name: 'CondsrCoilTemp', real: true},
	197: {name: 'CondenserFan.y1_out', real: true},
	198: {name: 'Pump_Aout', real: true},
	199: {name: 'CondenserFan.fan1_RPM_OUT_2'},
	200: {name: 'CondenserFan.fan2_RPM_in_2'},
	201: {name: 'CondenserFan.fan2_RPM_OUT_2'},
	202: {name: 'CondenserFan.fan1_RPM_in_2'},
	203: {name: 'BLDC_Mng.Info_BLDC1.Info_CompRequest', real: true},
	204: {name: 'BLDC_Mng.Info_BLDC1.Info_ReqSpeedToPWRP', real: true},
	205: {name: 'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps', real: true},
	206: {
		name: 'EVD_Emb_1.Params_EVDEMB_1.EVD.Variables.SH_EvapTemp.Val',
		real: true,
	},
	207: {
		name: 'EVD_Emb_1.Params_EVDEMB_1.EVD.Variables.EEV_PosSteps.Val',
		real: true,
	},
	208: {name: 'EVD_Emb_1.Params_EVDEMB_1.EVD.Variables.DscgSH.Val', real: true},
	209: {
		name: 'BLDC_Mng.Info_BLDC1.Info_HTZone',
		enum: ['ok', 'controlled', 'limited'],
	},
	210: {
		name: 'EVD_Emb_1.Params_EVDEMB_1.EVD.Variables.ProtStatus.Val',
		enum: ['no', 'no', 'LowSH', 'lop', 'Mop', 'HiTcond'],
	},
	211: {name: 'EVD_Emb_1.Params_EVDEMB_1.EVD.Variables.SH.Val', real: true},

	215: {name: 'uniton_mode', enum: ['cooling', 'heating', 'hot water']},
	216: {name: 'Temp_Target', real: true},
	263: {name: 'nightmode-max-rps-compressor', real: true}, // max 70 it seems, min ?
	264: {name: 'nightmode-max-rpm-fan', real: true}, // max 800
	320: {name: 'unknown_320_0 or 1'},
	333: {name: 'unknown_333_compressor'},
	334: {name: 'unknown_334_c1', real: true},
	335: {name: 'unknown_335_c2', real: true},
}

const fetchData = async () => {
	const client = new m()
	await client.connectRTU('/dev/ttyUSB0', {
		baudRate: 19200,
		dataBits: 8,
		stopBits: 2,
		parity: 'none',
		debug: 'modbus',
	})
	client.setID(1)

	// let data = await client.readCoils(0, 13)
	// const outputCoils = data.data
	const discreteInputs = {}
	{
		for (let i = 0; i < 400; i += 200) {
			const data = await client.readDiscreteInputs(i, 200)
			for (let j = 0; j < 200; j++) {
				const n = i + j
				const val = data.data[j]
				const k = knownDI[n]
				if (k) {
					discreteInputs[k.name] = val
				} else if (val) {
					discreteInputs[`unknown-di-${n}`] = val
				}
			}
		}
	}

	const coils = {}
	{
		for (let i = 0; i < 400; i += 200) {
			const data = await client.readCoils(i, 200)
			for (let j = 0; j < 200; j++) {
				const n = i + j
				const val = data.data[j]
				const k = knownCoils[n]
				if (k) {
					coils[k.name] = val
				} else if (val) {
					coils[`unknown-coil-${n}`] = val
				}
			}
		}
	}

	// let buf = Buffer.from([])
	const registers = {}
	for (let i = 0; i < 500; i += 13) {
		const data = await client.readHoldingRegisters(i, 13)
		// buf = Buffer.concat([buf, data.buffer])
		for (let j = 0; j < 13; j++) {
			const n = i + j
			// const val = data.data[j]
			const val = data.buffer.readInt16BE(j * 2)
			const k = knownRegs[n]
			if (k) {
				if (k.enum) registers[k.name] = k.enum[val] || `enum:${val}`
				else if (k.real) registers[k.name] = val / 10
				else registers[k.name] = val
			} else if (val) {
				registers[`unknown-reg-${n}`] = val
			}
		}
	}
	console.log({discreteInputs, coils, registers})

	client.close()
}

fetchData()

/*
Startup sequence:

    Temp_Target: 18.6,                                                    |         Temp_Target: 18.4,
Fri Nov 12 12:45:24 CET 2021
    CW_InTemp: 18.4,                                                      |         CW_InTemp: 18.3,
    CW_OutTemp: 18.3,                                                     |         CW_OutTemp: 18.2,
    DscgTemp: 26.6,                                                       |         DscgTemp: 26.5,
    DscgP: 9.9,                                                           |         DscgP: 10,
    CondsrCoilTemp: 11.3,                                                 |         CondsrCoilTemp: 11.2,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 0,                            |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 23.4,
    Temp_Target: 18.4,                                                    |         Temp_Target: 18.3,
Fri Nov 12 12:45:30 CET 2021
    CW_InTemp: 18.3,                                                      |         CW_InTemp: 18.2,
    CW_OutTemp: 18.2,                                                     |         CW_OutTemp: 18.1,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 23.4,                         |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 25.5,
    Temp_Target: 18.3,                                                    |         Temp_Target: 18.2,
Fri Nov 12 12:45:37 CET 2021
                                                                          >         'unknown-di-179': true,
    CW_InTemp: 18.2,                                                      |         CW_InTemp: 18.1,
    CW_OutTemp: 18.1,                                                     |         CW_OutTemp: 18,
    AmbTemp: 11,                                                          |         AmbTemp: 11.1,
    DscgTemp: 26.5,                                                       |         DscgTemp: 26.4,
    SuctP: 10.1,                                                          |         SuctP: 10.2,
    'CondenserFan.y1_out': 0,                                             |         'CondenserFan.y1_out': 30,
    'CondenserFan.fan1_RPM_OUT_2': 0,                                     |         'CondenserFan.fan1_RPM_OUT_2': 380,
    'CondenserFan.fan2_RPM_OUT_2': 0,                                     |         'CondenserFan.fan2_RPM_OUT_2': 380,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 25.5,                         |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 27.5,
    'BLDC_Mng.Info_BLDC1.Info_ReqSpeedToPWRP': 0,                         |         'BLDC_Mng.Info_BLDC1.Info_ReqSpeedToPWRP': 45.5,
    Temp_Target: 18.2,                                                    |         Temp_Target: 18.1,
Fri Nov 12 12:45:43 CET 2021
    'Outputs.DoutVal_2-running': false,                                   |         'Outputs.DoutVal_2-running': true,
                                                                          >         'unknown-di-180': true,
    CW_InTemp: 18.1,                                                      |         CW_InTemp: 18,
    CW_OutTemp: 18,                                                       |         CW_OutTemp: 17.9,
    DscgTemp: 26.4,                                                       |         DscgTemp: 26.6,
    SuctTemp: 22,                                                         |         SuctTemp: 21.9,
    DscgP: 10,                                                            |         DscgP: 11.8,
    SuctP: 10.2,                                                          |         SuctP: 9.8,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 27.5,                         |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 29.5,
    'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 0,                         |         'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 12.3,
    Temp_Target: 18.1,                                                    |         Temp_Target: 18,
    maybe_compressor: 0,                                                  |         maybe_compressor: 1,
    maybe_334: 0,                                                         |         maybe_334: 3.7,
    maybe_335: 0,                                                         |         maybe_335: 1.9,
Fri Nov 12 12:45:49 CET 2021
    CW_InTemp: 18,                                                        |         CW_InTemp: 17.9,
    CW_OutTemp: 17.9,                                                     |         CW_OutTemp: 17.8,
    DscgTemp: 26.6,                                                       |         DscgTemp: 27.7,
    SuctTemp: 21.9,                                                       |         SuctTemp: 21.4,
    DscgP: 11.8,                                                          |         DscgP: 12.3,
    SuctP: 9.8,                                                           |         SuctP: 9.4,
    'CondenserFan.fan1_RPM_in_2': 0,                                      |         'CondenserFan.fan1_RPM_in_2': 230,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 29.5,                         |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 31.2,
    'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 12.3,                      |         'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 17.1,
    Temp_Target: 18,                                                      |         Temp_Target: 17.9,
    maybe_compressor: 1,                                                  |         maybe_compressor: 3,
    maybe_334: 3.7,                                                       |         maybe_334: 6,
    maybe_335: 1.9,                                                       |         maybe_335: 3,
Fri Nov 12 12:45:56 CET 2021
    CW_InTemp: 17.9,                                                      |         CW_InTemp: 17.8,
    CW_OutTemp: 17.8,                                                     |         CW_OutTemp: 17.7,
    DscgTemp: 27.7,                                                       |         DscgTemp: 29,
    SuctTemp: 21.4,                                                       |         SuctTemp: 19.5,
    DscgP: 12.3,                                                          |         DscgP: 13.1,
    SuctP: 9.4,                                                           |         SuctP: 8.9,
    CondsrCoilTemp: 11.2,                                                 |         CondsrCoilTemp: 11.1,
    'CondenserFan.y1_out': 30,                                            |         'CondenserFan.y1_out': 32.6,
    'CondenserFan.fan1_RPM_OUT_2': 380,                                   |         'CondenserFan.fan1_RPM_OUT_2': 395,
    'CondenserFan.fan2_RPM_OUT_2': 380,                                   |         'CondenserFan.fan2_RPM_OUT_2': 395,
    'CondenserFan.fan1_RPM_in_2': 230,                                    |         'CondenserFan.fan1_RPM_in_2': 354,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 31.2,                         |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 32.8,
    'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 17.1,                      |         'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 24.3,
    Temp_Target: 17.9,                                                    |         Temp_Target: 17.8,
    maybe_compressor: 3,                                                  |         maybe_compressor: 5,
    maybe_334: 6,                                                         |         maybe_334: 7.5,
    maybe_335: 3,                                                         |         maybe_335: 3.6,
Fri Nov 12 12:46:02 CET 2021
    CW_OutTemp: 17.7,                                                     |         CW_OutTemp: 17.9,
    AmbTemp: 11.1,                                                        |         AmbTemp: 11,
    DscgTemp: 29,                                                         |         DscgTemp: 29.9,
    SuctTemp: 19.5,                                                       |         SuctTemp: 16.9,
    DscgP: 13.1,                                                          |         DscgP: 13.5,
    SuctP: 8.9,                                                           |         SuctP: 8.5,
    CondsrCoilTemp: 11.1,                                                 |         CondsrCoilTemp: 10.9,
    'CondenserFan.y1_out': 32.6,                                          |         'CondenserFan.y1_out': 39.3,
    'CondenserFan.fan1_RPM_OUT_2': 395,                                   |         'CondenserFan.fan1_RPM_OUT_2': 435,
    'CondenserFan.fan2_RPM_in_2': 0,                                      |         'CondenserFan.fan2_RPM_in_2': 318,
    'CondenserFan.fan2_RPM_OUT_2': 395,                                   |         'CondenserFan.fan2_RPM_OUT_2': 435,
    'CondenserFan.fan1_RPM_in_2': 354,                                    |         'CondenserFan.fan1_RPM_in_2': 381,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 32.8,                         |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 35,
    'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 24.3,                      |         'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 31.5,
    maybe_compressor: 5,                                                  |         maybe_compressor: 8,
    maybe_334: 7.5,                                                       |         maybe_334: 9.9,
    maybe_335: 3.6,                                                       |         maybe_335: 4.4,
Fri Nov 12 12:46:08 CET 2021
    CW_InTemp: 17.8,                                                      |         CW_InTemp: 17.7,
    CW_OutTemp: 17.9,                                                     |         CW_OutTemp: 18.2,
    AmbTemp: 11,                                                          |         AmbTemp: 10.9,
    DscgTemp: 29.9,                                                       |         DscgTemp: 30.7,
    SuctTemp: 16.9,                                                       |         SuctTemp: 14.3,
    DscgP: 13.5,                                                          |         DscgP: 14.2,
    SuctP: 8.5,                                                           |         SuctP: 7.8,
    CondsrCoilTemp: 10.9,                                                 |         CondsrCoilTemp: 10.5,
    'CondenserFan.y1_out': 39.3,                                          |         'CondenserFan.y1_out': 51.2,
    'CondenserFan.fan1_RPM_OUT_2': 435,                                   |         'CondenserFan.fan1_RPM_OUT_2': 507,
    'CondenserFan.fan2_RPM_in_2': 318,                                    |         'CondenserFan.fan2_RPM_in_2': 428,
    'CondenserFan.fan2_RPM_OUT_2': 435,                                   |         'CondenserFan.fan2_RPM_OUT_2': 507,
    'CondenserFan.fan1_RPM_in_2': 381,                                    |         'CondenserFan.fan1_RPM_in_2': 440,
    'BLDC_Mng.Info_BLDC1.Info_CompRequest': 35,                           |         'BLDC_Mng.Info_BLDC1.Info_CompRequest': 37.4,
    'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 31.5,                      |         'BLDC_Mng.Info_PWRP1.Info_RotorSpeed_rps': 36.3,
    Temp_Target: 17.8,                                                    |         Temp_Target: 17.7,
    maybe_compressor: 8,                                                  |         maybe_compressor: 11,
    maybe_334: 9.9,                                                       |         maybe_334: 12.2,
    maybe_335: 4.4,                                                       |         maybe_335: 5.1,

 */
