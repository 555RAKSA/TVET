
export enum GCodeMode {
  G1 = 1,
  G2 = 2,
  G3 = 3
}

export enum TransitionMode {
  LTL = 'LTL',
  ATL = 'ATL',
  LTA = 'LTA',
  ATA = 'ATA',
  NONE = 'NONE'
}

export interface GCodeLine {
  g: number;
  x: number;
  z: number;
  r: number;
}

export interface CalcState {
  _OX: number;
  _OZ: number;
  _X: number;
  _Z: number;
  _RAD: number;
  _ORAD: number;
  _OI: number;
  _OK: number;
  _I: number;
  _K: number;
  _OG: number;
  _G: number;
  _MODE: TransitionMode;
  _OAN: number;
  _AN: number;
  _NR: number;
  _ED: number;
}

export interface PLCResult {
  line: string;
  vars: string;
  calGCode: string[];
}

export interface FinalParseResult {
  plcRows: PLCResult[];
  roughGCode: string;
  finishGCode: string;
  finishContourGCode: string;
}

export interface HeaderConfig {
  tnr: string;
  vc: number;
  std: number;
  zal: number;
  doc: number;
  feedr: number;
  tnf: string;
  vcf: number;
  feedf: number;
}

function calculatePass(inputLines: string[], targetNR: number, useLineNumbers: boolean, startN: number = 10, collectVars: boolean = false, useCommonPoint: boolean = false): { calBlocks: string[], plcResults: PLCResult[], lastN: number } {
  const calBlocks: string[] = [];
  const plcResults: PLCResult[] = [];
  let nCounter = startN;

  let modalG = 1;
  let modalX = 0;
  let modalZ = 0;
  let modalR = 0;

  let prevX = 0;
  let prevZ = 0;
  let prevG = 1;
  let prevR = 0;
  let prevAN = 90;
  let prevI = 0;
  let prevK = 0;

  const formatOutput = (g: string, x: number, z: number, r?: number) => {
    let outX = x;
    let outZ = z;
    if (useCommonPoint) {
      outX = x - 2 * targetNR;
      outZ = z - targetNR;
    }
    const rPart = r !== undefined ? ` R${r.toFixed(4)}` : '';
    return `${g} X${outX.toFixed(4)} Z${outZ.toFixed(4)}${rPart}`;
  };

  for (let i = 0; i < inputLines.length; i++) {
    const rawLine = inputLines[i].trim();
    const gMatch = rawLine.match(/G(\d+)/i);
    const xMatch = rawLine.match(/X([\d.-]+)/i);
    const zMatch = rawLine.match(/Z([\d.-]+)/i);
    const rMatch = rawLine.match(/R([\d.-]+)/i);

    const g = gMatch ? parseInt(gMatch[1]) : modalG;
    const x = xMatch ? parseFloat(xMatch[1]) : modalX;
    const z = zMatch ? parseFloat(zMatch[1]) : modalZ;
    const r = rMatch ? parseFloat(rMatch[1]) : modalR;

    modalG = g;
    modalX = x;
    modalZ = z;
    modalR = r;

    const isFirstLine = i === 0;
    const isEndLine = i === inputLines.length - 1;

    let currentState: CalcState = {
      _OX: prevX, _OZ: prevZ, _X: x, _Z: z, _RAD: r, _ORAD: prevR,
      _OI: prevI, _OK: prevK, _I: 0, _K: 0, _OG: prevG, _G: g,
      _MODE: TransitionMode.NONE, _OAN: prevAN, _AN: 0, _NR: targetNR, _ED: isEndLine ? 1 : 0
    };

    const blockGCode: string[] = [];

    if (isFirstLine) {
        currentState._AN = 90;
        if (collectVars) {
            plcResults.push({
                line: rawLine,
                vars: `[_X=${x.toFixed(3)}, _Z=${z.toFixed(3)}, _AN=90, _G=${g}]`,
                calGCode: []
            });
        }
    } else {
      const dx = (currentState._X - currentState._OX) / 2;
      const dz = currentState._Z - currentState._OZ;
      currentState._AN = (Math.atan2(dx, dz) * 180) / Math.PI;

      if (currentState._OG === 1 && currentState._G === 1) currentState._MODE = TransitionMode.LTL;
      else if (currentState._OG > 1 && currentState._G === 1) currentState._MODE = TransitionMode.ATL;
      else if (currentState._OG === 1 && currentState._G > 1) currentState._MODE = TransitionMode.LTA;
      else if (currentState._OG > 1 && currentState._G > 1) currentState._MODE = TransitionMode.ATA;

      if (currentState._G > 1 && currentState._RAD !== 0) {
        const r1 = (currentState._X - currentState._OX) / 2;
        const r2 = currentState._Z - currentState._OZ;
        const len = Math.sqrt(r1 * r1 + r2 * r2) / 2;
        let ratio = len / Math.abs(currentState._RAD);
        if (ratio > 1) ratio = 1; if (ratio < -1) ratio = -1;
        let r3 = currentState._AN + (Math.acos(ratio) * 180 / Math.PI);
        if (currentState._G === 2) r3 = currentState._AN - (Math.acos(ratio) * 180 / Math.PI);
        const r3Rad = (r3 * Math.PI) / 180;
        currentState._I = currentState._OX + currentState._RAD * 2 * Math.sin(r3Rad);
        currentState._K = currentState._OZ + currentState._RAD * Math.cos(r3Rad);
      }

      if (currentState._MODE === TransitionMode.LTL) {
        const r3 = (currentState._AN - currentState._OAN) / 2;
        const r3Rad = (r3 * Math.PI) / 180;
        const r4 = currentState._NR / Math.cos(r3Rad);
        const r5 = currentState._AN - 90 - r3;
        const r5Rad = (r5 * Math.PI) / 180;
        const r11_x = currentState._OX + 2 * r4 * Math.sin(r5Rad);
        const r12_z = currentState._OZ + r4 * Math.cos(r5Rad);
        blockGCode.push(formatOutput('G1', r11_x, r12_z));
        if (currentState._ED === 1) {
          const end_x = currentState._X + 2 * currentState._NR * Math.sin((currentState._AN - 90) * Math.PI / 180);
          const end_z = currentState._Z + currentState._NR * Math.cos((currentState._AN - 90) * Math.PI / 180);
          blockGCode.push(formatOutput('G1', end_x, end_z));
        }
      } else if (currentState._MODE === TransitionMode.ATL) {
        const r1_dz = currentState._Z - currentState._OZ;
        const r2_dx = (currentState._X - currentState._OX) / 2;
        const r20_an = Math.atan2(r2_dx, r1_dz) * 180 / Math.PI;
        const r1_ozk = currentState._OZ - currentState._OK;
        const r2_oxi = (currentState._OX - currentState._OI) / 2;
        const exit_an = Math.atan2(r2_oxi, r1_ozk) * 180 / Math.PI;
        const R1_calc = currentState._NR + currentState._ORAD * Math.cos((90 + (exit_an - r20_an)) * Math.PI / 180);
        let rff = currentState._OG === 3 ? currentState._ORAD + currentState._NR : currentState._ORAD - currentState._NR;
        let r2_ratio = R1_calc / rff;
        if (r2_ratio > 1.0) r2_ratio = 1.0; if (r2_ratio < -1.0) r2_ratio = -1.0;
        let r2_final = r20_an - 90 + (Math.acos(r2_ratio) * 180 / Math.PI);
        const r2_final_rad = r2_final * Math.PI / 180;
        const r11 = currentState._OK + rff * Math.cos(r2_final_rad);
        const r12 = currentState._OI + rff * Math.sin(r2_final_rad) * 2;
        blockGCode.push(formatOutput(currentState._OG === 3 ? 'G3' : 'G2', r12, r11, rff));
      } else if (currentState._MODE === TransitionMode.LTA) {
        const r1_dz = currentState._Z - currentState._OZ;
        const r2_dx = (currentState._X - currentState._OX) / 2;
        const an_vec = Math.atan2(r2_dx, r1_dz);
        let r3_dist = Math.sqrt(r1_dz * r1_dz + r2_dx * r2_dx) / 2;
        let r4_ratio = r3_dist / Math.abs(currentState._RAD);
        if (r4_ratio > 1) r4_ratio = 1; if (r4_ratio < -1) r4_ratio = -1;
        const r4_acos = Math.acos(r4_ratio);
        let r5_ang = currentState._G === 2 ? an_vec - r4_acos : an_vec + r4_acos;
        let rff = currentState._G === 2 ? currentState._RAD - currentState._NR : currentState._RAD + currentState._NR;
        const center_k = currentState._OZ + currentState._RAD * Math.cos(r5_ang);
        const center_i = currentState._OX + currentState._RAD * Math.sin(r5_ang) * 2;
        currentState._I = center_i; currentState._K = center_k;
        const oan_rad = (currentState._OAN * Math.PI) / 180;
        let r6_val = currentState._RAD * Math.cos(Math.PI / 2 - (r5_ang - oan_rad)) + currentState._NR;
        let r7_ratio = r6_val / rff;
        if (r7_ratio > 1) r7_ratio = 1; if (r7_ratio < -1) r7_ratio = -1;
        const r7_final = oan_rad - Math.PI / 2 - Math.acos(r7_ratio);
        blockGCode.push(formatOutput('G1', center_i + rff * Math.sin(r7_final) * 2, center_k + rff * Math.cos(r7_final)));
        if (currentState._ED === 1) {
          const an_end = Math.atan2((currentState._X - center_i) / 2, currentState._Z - center_k);
          blockGCode.push(formatOutput(currentState._G === 3 ? 'G3' : 'G2', center_i + rff * Math.sin(an_end) * 2, center_k + rff * Math.cos(an_end), rff));
        }
      } else if (currentState._MODE === TransitionMode.ATA) {
        const r1_dz = currentState._K - currentState._OK;
        const r2_dx = (currentState._I - currentState._OI) / 2;
        let an_centers = Math.atan2(r2_dx, r1_dz);
        const dist_centers = Math.sqrt(r1_dz * r1_dz + r2_dx * r2_dx);
        let r11_off = currentState._OG === 2 ? currentState._ORAD - currentState._NR : currentState._ORAD + currentState._NR;
        let r12_off = currentState._G === 2 ? currentState._RAD - currentState._NR : currentState._RAD + currentState._NR;
        let cos_val = (dist_centers * dist_centers + r11_off * r11_off - r12_off * r12_off) / (2 * dist_centers * r11_off);
        if (cos_val > 1) cos_val = 1; if (cos_val < -1) cos_val = -1;
        const acos_res = Math.acos(cos_val);
        an_centers += (currentState._G === 2 ? acos_res : -acos_res);
        blockGCode.push(formatOutput(currentState._OG === 2 ? 'G2' : 'G3', currentState._OI + 2 * r11_off * Math.sin(an_centers), currentState._OK + r11_off * Math.cos(an_centers), r11_off));
        if (currentState._ED === 1) {
          const r1_end_dz = currentState._Z - currentState._K;
          const r2_end_dx = (currentState._X - currentState._I) / 2;
          const an_end = Math.atan2(r2_end_dx, r1_end_dz);
          const rff = currentState._G === 2 ? currentState._RAD - currentState._NR : currentState._RAD + currentState._NR;
          blockGCode.push(formatOutput(currentState._G === 2 ? 'G2' : 'G3', currentState._X + currentState._NR * Math.sin(an_end) * 2, currentState._Z + currentState._NR * Math.cos(an_end), rff));
        }
      }

      const formattedBlock: string[] = [];
      for (const line of blockGCode) {
        if (useLineNumbers) {
          formattedBlock.push(`N${nCounter} ${line}`);
          nCounter += 10;
        } else {
          formattedBlock.push(line);
        }
      }
      calBlocks.push(...formattedBlock);

      if (collectVars) {
        const varList = Object.entries(currentState)
            .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(3) : v}`)
            .join(', ');

        plcResults.push({
            line: rawLine,
            vars: `[${varList}]`,
            calGCode: formattedBlock
        });
      }
    }

    prevX = x; prevZ = z; prevG = g; prevR = r; prevAN = currentState._AN; prevI = currentState._I; prevK = currentState._K;
  }
  return { calBlocks, plcResults, lastN: nCounter - 10 };
}

export function parseGCode(input: string, noseRadius: number, ra: number = 0, fa: number = 0, useCommonPoint: boolean = false, header?: HeaderConfig): FinalParseResult {
  const inputLines = input.split('\n').filter(l => l.trim() !== '');
  
  // ROUGH CUTTING Section
  const roughNR = noseRadius + ra + fa;
  const { calBlocks: roughBlocks, plcResults, lastN: endCount } = calculatePass(inputLines, roughNR, true, 10, true, useCommonPoint);
  
  const headerLines: string[] = [];
  if (header) {
    headerLines.push(
      "G28 U0 W0",
      `T${header.tnr}`,
      "G18 G99",
      `G96 S${header.vc} M03 M8`,
      `G0 X${(header.std + header.doc / 2).toFixed(3)} Z${(header.zal + 1).toFixed(3)}`,
      `G71 U${header.doc.toFixed(3)} R1`,
      `G71 P10 Q${endCount} F${header.feedr.toFixed(3)}`
    );
  }

  // ROUGH-FINISH Section
  const finishNR = noseRadius + fa;
  const { calBlocks: finishBlocks } = calculatePass(inputLines, finishNR, false, 0, false, useCommonPoint);

  let finishSetup: string[] = [];
  if (header && finishBlocks.length > 0) {
    const firstLine = finishBlocks[0];
    const xMatch = firstLine.match(/X([\d.-]+)/i);
    const zMatch = firstLine.match(/Z([\d.-]+)/i);
    if (xMatch && zMatch) {
      const xVal = xMatch[1];
      const zVal = zMatch[1];
      finishSetup.push(
        `G0 X${(header.std + 5).toFixed(3)} Z${header.zal.toFixed(3)}`,
        `G0 X${xVal}`,
        `G1 Z${zVal} F${header.feedr.toFixed(3)}`
      );
    }
  }

  let finishFooter: string[] = [];
  if (header) {
    finishFooter.push(
      `G0 X${(header.std + 5).toFixed(3)} Z${header.zal.toFixed(3)}`,
      "M5",
      "M9",
      "G28 U0 W0"
    );
  }

  // FINISH CONTOUR Section
  const { calBlocks: contourBlocks } = calculatePass(inputLines, noseRadius, false, 0, false, useCommonPoint);
  let contourSetup: string[] = [];
  if (header && contourBlocks.length > 0) {
    const firstLine = contourBlocks[0];
    const xMatch = firstLine.match(/X([\d.-]+)/i);
    const zMatch = firstLine.match(/Z([\d.-]+)/i);
    if (xMatch && zMatch) {
      contourSetup.push(
        `T${header.tnf}`,
        "G18 G99",
        `G96 S${header.vcf} M03 M8`,
        `G0 X${(header.std + 5).toFixed(3)} Z${header.zal.toFixed(3)}`,
        `G0 X${xMatch[1]}`,
        `G1 Z${zMatch[1]} F${header.feedf.toFixed(3)}`
      );
    }
  }

  let contourFooter: string[] = [];
  if (header) {
    contourFooter.push(
      `G0 X${(header.std + 5).toFixed(3)} Z${header.zal.toFixed(3)}`,
      "M5",
      "M9",
      "G28 U0 W0",
      "G290",
      "M30"
    );
  }

  const plcRows: PLCResult[] = [
    { line: "(HEADER)", vars: `[COMMENT=(ROUGH CUTTING), _NR_TOTAL=${roughNR.toFixed(3)}, COMMON_POINT=${useCommonPoint}]`, calGCode: ["(ROUGH CUTTING)"] },
    ...plcResults
  ];

  return {
    plcRows,
    roughGCode: ["G291", "(ROUGH CUTTING)", ...headerLines, ...roughBlocks].join('\n'),
    finishGCode: ["(ROUGH-FINISH)", ...finishSetup, ...finishBlocks, ...finishFooter].join('\n'),
    finishContourGCode: ["(FINISH CONTOUR)", ...contourSetup, ...contourBlocks, ...contourFooter].join('\n')
  };
}
