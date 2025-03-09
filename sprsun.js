const m = require('modbus-serial')

const knownDI = {
	0: {name: 'unitOn'},
	1: {name: 'InputsCheck.FlwSw_Din'},
	2: {name: 'InputsCheck.RemoteOnOff_Din'},
	3: {name: 'InputsCheck.Terminal_Switch_Din'},
	4: {name: 'InputsCheck.ProtSeqPh_Din'},
	5: {name: 'Outputs.DoutVal_1'},
	6: {name: 'Outputs.DoutVal_2 running'},
	7: {name: 'Outputs.DoutVal_3 defrost maybe'},
	8: {name: 'Outputs.DoutVal_4 pump'},
	9: {name: 'Outputs.DoutVal_5'},
	10: {name: 'Outputs.DoutVal_6'},
	11: {name: 'Outputs.DoutVal_7'},
	12: {name: 'Outputs.DoutVal_8'},
	141: {name: 'unknown_di_141 overpressure fault?'},
	151: {name: 'unknown_di_151 no idea'},
	178: {name: 'unknown_di_178 pump-related'},
	179: {name: 'unknown_di_179 fan-related'},
	180: {name: 'unknown_di_180 rotor-related'},
	237: {name: 'unknown_di_237 defrost'},
}

const knownCoils = {
	0: {name: 'En_AuxHeat'},
	1: {name: 'En_Customer_16'},
	2: {name: 'OnOffUnitMng.UnitTypAfterPwrOff'},
	// Request heat on/off (inverts DI 3, terminal switch)
	18: {name: 'ac_linkage_Normally_Open'},
	38: {name: 'En_SchedOnOff'},
	39: {name: 'En_Sch_Setp'},
	// Turn the unit on/off true/false
	40: {name: 'OnOffUnitMng.KeybOnOff'},
}

// No idea where to read these
// After an overpressure alarm dismissal I got
//    'Outputs.DoutVal_7': false,                                           |         'Outputs.DoutVal_7': true,
//	    'unknown-di-141': true,                                               <
// so 141 is either overpressure alarm or generic fault

const alarms = {
	1: 'Too many mem writings',
	2: 'Retain mem write error',
	3: 'Inlet probe error',
	4: 'Outlet probe error',
	5: 'Ambient probe error',
	6: 'Condenser coil temp',
	7: 'Water flow switch',
	8: 'Phase sequ.prot.alarm',
	9: 'Unit work hour warning',
	10: 'Pump work hour warning',
	11: 'Comp.work hour warning',
	12: 'Cond.fan work hourWarn',
	13: 'Low superheat - Vlv.A',
	14: 'Low superheat - Vlv.B',
	15: 'LOP - Vlv.A',
	16: 'LOP - Vlv.B',
	17: 'MOP - Vlv.A',
	18: 'MOP - Vlv.B',
	19: 'Motor error - Vlv.A',
	20: 'Motor error - Vlv.B',
	21: 'Low suct.temp. - Vlv.A',
	22: 'Low suct.temp. - Vlv.B',
	23: 'High condens.temp.EVD',
	24: 'Probe S1 error EVD',
	25: 'Probe S2 error EVD',
	26: 'Probe S3 error EVD',
	27: 'Probe S4 error EVD',
	28: 'Battery discharge EVD',
	29: 'EEPROM alarm EVD',
	30: 'Incomplete closing EVD',
	31: 'Emergency closing EVD',
	32: 'FW not compatible EVD',
	33: 'Config. error EVD',
	34: 'EVD Driver offline',
	35: 'BLDC-alarm:High startup DeltaP',
	36: 'BLDC-alarm:Compressor shut off',
	37: 'BLDC-alarm:Out of Envelope',
	38: 'BLDC-alarm:Starting fail wait',
	39: 'BLDC-alarm:Starting fail exceeded',
	40: 'BLDC-alarm:Low delta pressure',
	41: 'BLDC-alarm:High discarge gas temp',
	42: 'Envelope-alarm:High compressor ratio',
	43: 'Envelope-alarm:High discharge press.',
	44: 'Envelope-alarm:High current',
	45: 'Envelope-alarm:High suction pressure',
	46: 'Envelope-alarm:Low compressor ratio',
	47: 'Envelope-alarm:Low pressure diff.',
	48: 'Envelope-alarm:Low discharge pressure',
	49: 'Envelope-alarm:Low suction pressure',
	50: 'Envelope-alarm:High discharge temp.',
	51: 'Power+ alarm:01-Overcurrent',
	52: 'Power+ alarm:02-Motor overload',
	53: 'Power+ alarm:03-DCbus overvoltage',
	54: 'Power+ alarm:04-DCbus undervoltage',
	55: 'Power+ alarm:05-Drive overtemp.',
	56: 'Power+ alarm:06-Drive undertemp.',
	57: 'Power+ alarm:07-Overcurrent HW',
	58: 'Power+ alarm:08-Motor overtemp.',
	59: 'Power+ alarm:09-IGBT module error',
	60: 'Power+ alarm:10-CPU error',
	61: 'Power+ alarm:11-Parameter default',
	62: 'Power+ alarm:12-DCbus ripple',
	63: 'Power+ alarm:13-Data comm. Fault',
	64: 'Power+ alarm:14-Thermistor fault',
	65: 'Power+ alarm:15-Autotuning fault',
	66: 'Power+ alarm:16-Drive disabled',
	67: 'Power+ alarm:17-Motor phase fault',
	68: 'Power+ alarm:18-Internal fan fault',
	69: 'Power+ alarm:19-Speed fault',
	70: 'Power+ alarm:20-PFC module error',
	71: 'Power+ alarm:21-PFC overvoltage',
	72: 'Power+ alarm:22-PFC undervoltage',
	73: 'Power+ alarm:23-STO DetectionError',
	74: 'Power+ alarm:24-STO DetectionError',
	75: 'Power+ alarm:25-Ground fault',
	76: 'Power+ alarm:26-Internal error 1',
	77: 'Power+ alarm:27-Internal error 2',
	78: 'Power+ alarm:28-Drive overload',
	79: 'Power+ alarm:29-uC safety fault',
	80: 'Power+ alarm:98-Unexpected restart',
	81: 'Power+ alarm:99-Unexpected stop',
	82: 'Power+ safety alarm:01-Current meas.fault',
	83: 'Power+ safety alarm:02-Current unbalanced',
	84: 'Power+ safety alarm:03-Over current',
	85: 'Power+ safety alarm:04-STO alarm',
	86: 'Power+ safety alarm:05-STO hardware alarm',
	87: 'Power+ safety alarm:06-PowerSupply missing',
	88: 'Power+ safety alarm:07-HW fault cmd.buffer',
	89: 'Power+ safety alarm:08-HW fault heater c.',
	90: 'Power+ safety alarm:09-Data comm. Fault',
	91: 'Power+ safety alarm:10-Compr. stall detect',
	92: 'Power+ safety alarm:11-DCbus over current',
	93: 'Power+ safety alarm:12-HWF DCbus current',
	94: 'Power+ safety alarm:13-DCbus voltage',
	95: 'Power+ safety alarm:14-HWF DCbus voltage',
	96: 'Power+ safety alarm:15-Input voltage',
	97: 'Power+ safety alarm:16-HWF input voltage',
	98: 'Power+ safety alarm:17-DCbus power alarm',
	99: 'Power+ safety alarm:18-HWF power mismatch',
	100: 'Power+ safety alarm:19-NTC over temp.',
	101: 'Power+ safety alarm:20-NTC under temp.',
	102: 'Power+ safety alarm:21-NTC fault',
	103: 'Power+ safety alarm:22-HWF sync fault',
	104: 'Power+ safety alarm:23-Invalid parameter',
	105: 'Power+ safety alarm:24-FW fault',
	106: 'Power+ safety alarm:25-HW fault',
	107: 'Power+ safety alarm:26-reseved',
	108: 'Power+ safety alarm:27-reseved',
	109: 'Power+ safety alarm:28-reseved',
	110: 'Power+ safety alarm:29-reseved',
	111: 'Power+ safety alarm:30-reseved',
	112: 'Power+ safety alarm:31-reseved',
	113: 'Power+ safety alarm:32-reseved',
	114: 'Power+ alarm:Power+ offline',
	115: 'EEV alarm:Low superheat',
	116: 'EEV alarm:LOP',
	117: 'EEV alarm:MOP',
	118: 'EEV alarm:High condens.temp.',
	119: 'EEV alarm:Low suction temp.',
	120: 'EEV alarm:Motor error',
	121: 'EEV alarm:Self Tuning',
	122: 'EEV alarm:Emergency closing',
	123: 'EEV alarm:Temperature delta',
	124: 'EEV alarm:Pressure delta',
	125: 'EEV alarm:Param.range error',
	126: 'EEV alarm:ServicePosit% err',
	127: 'EEV alarm:ValveID pin error',
	128: 'Low press alarm',
	129: 'High press alarm',
	130: 'Disc.temp.probe error',
	131: 'Suct.temp.probe error',
	132: 'Disc.press.probe error',
	133: 'Suct.press.probe error',
	134: 'Tank temp.probe error',
	135: 'EVI SuctT.probe error',
	136: 'EVI SuctP.probe error',
	137: 'Flow switch alarm',
	138: 'High temp. alarm',
	139: 'Low temp. alarm',
	140: 'Temp.delta alarm',
	141: 'EVI alarm:Param.range error',
	142: 'EVI alarm:Low superheat',
	143: 'EVI alarm:LOP',
	144: 'EVI alarm:MOP',
	145: 'EVI alarm:High condens.temp.',
	146: 'EVI alarm:Low suction temp.',
	147: 'EVI alarm:Motor error',
	148: 'EVI alarm:Self Tuning',
	149: 'EVI alarm:Emergency closing',
	150: 'EVI alarm:ServicePosit% err',
	151: 'EVI alarm:ValveID pin error',
	152: 'Supply power error',
	153: 'Fan1 fault',
	154: 'Fan2 fault',
	155: 'Fans Offline',
	165: 'Slave1 Offline',
	166: 'Master Offline',
	167: 'Slave2 Offline',
	168: 'Slave3 Offline',
	169: 'Slave4 Offline',
	170: 'Slave5 Offline',
	171: 'Slave6 Offline',
	172: 'Slave7 Offline',
	173: 'Slave8 Offline',
	174: 'Slave9 Offline',
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
	16: {name: '16 Compressor low pressure alarm start delay s'},
	17: {name: '17 Compressor low pressure alarm run delay s'},
	19: {name: 'unknown_reg_19 600-700-780'},

	// alas, not correct
	// 105: {name: 'alarm', enum: alarms},

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
	276: {name: 'eco-cool-t1', real: true},
	277: {name: 'eco-cool-t2', real: true},
	278: {name: 'eco-cool-t3', real: true},
	279: {name: 'eco-cool-t4', real: true},
	280: {name: 'eco-heat-t1', real: true},
	281: {name: 'eco-heat-t2', real: true},
	282: {name: 'eco-heat-t3', real: true},
	283: {name: 'eco-heat-t4', real: true},
	284: {name: 'eco-hotwater-t1', real: true},
	285: {name: 'eco-hotwater-t2', real: true},
	286: {name: 'eco-hotwater-t3', real: true},
	287: {name: 'eco-hotwater-t4', real: true},
	288: {name: 'eco-cool-setT2', real: true},
	289: {name: 'eco-cool-setT3', real: true},
	290: {name: 'eco-cool-setT4', real: true},
	291: {name: 'eco-heat-setT1', real: true},
	292: {name: 'eco-heat-setT2', real: true},
	293: {name: 'eco-heat-setT3', real: true},
	294: {name: 'eco-hotwater-setT1', real: true},
	295: {name: 'eco-hotwater-setT2', real: true},
	296: {name: 'eco-hotwater-setT3', real: true},
	320: {name: 'unknown_reg_320 0 or 1'},
	333: {name: 'unknown_reg_333 compressor'},
	334: {name: 'motor current Vrms'},
	335: {name: 'motor current Arms', real: true},
	336: {name: 'eco-cool-setT1', real: true},
	337: {name: 'eco-heat-setT4', real: true},
	338: {name: 'eco-hotwater-setT4', real: true},
	488: {name: 'current-targetT', real: true},
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

setTimeout(()=>process.exit(1), 300000).unref()
fetchData().catch(err => {
	console.error('fetch fail', err)
	process.exit(2)
})

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
/*
Sure! Here are some concrete register numbers for alarm-related registers in a Carel heat pump controller:

Alarm status register: This register is typically located at address 40001 in the Modbus register map. It is a read-only register that provides information about the current alarm status of the system, including the alarm code and the alarm status (active or inactive).

Alarm enable/disable register: This register is typically located at address 10001 in the Modbus register map. It is a read-write register that allows the user to enable or disable specific alarms within the system. Each bit within the register corresponds to a specific alarm code.

Alarm reset register: This register is typically located at address 10002 in the Modbus register map. It is a write-only register that allows the user to reset any active alarms within the system. Writing a specific value to this register (usually 1) will clear all active alarms.

Alarm history register: This register is typically located at address 40201 in the Modbus register map. It is a read-only register that stores a log of all alarms that have occurred within the system, including the alarm code and the time and date of the alarm.

Alarm threshold registers: The specific addresses for these registers will depend on the parameter being monitored and the specific model of the controller. For example, the register for setting the temperature alarm threshold may be located at address 40011, while the register for setting the pressure alarm threshold may be located at address 40012.

It's important to note that these register addresses are just examples and may vary depending on the specific Carel heat pump controller being used. It's always best to consult the manufacturer's documentation or Modbus register map to determine the specific register addresses for a given controller.

*/
