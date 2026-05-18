import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Settings, 
  Terminal, 
  Copy, 
  Check, 
  Cpu, 
  FileCode,
  AlertCircle
} from 'lucide-react';
import { parseGCode, PLCResult } from './lib/gcode-logic';

export default function App() {
  const [gcode, setGcode] = useState('G1 X10 Z0\nG1 X20 Z-10\nG1 X40 Z-10\nG1 X50 Z-20');
  const [noseRadius, setNoseRadius] = useState(0.4);
  const [nrr, setNrr] = useState(0.8);
  const [ra, setRa] = useState(0.2);
  const [fa, setFa] = useState(0.2);
  const [useCommonPoint, setUseCommonPoint] = useState(true);

  // New Cutting Parameters
  const [tnr, setTnr] = useState('0101');
  const [vc, setVc] = useState(250);
  const [std, setStd] = useState(50);
  const [lastCalculatedMaxX, setLastCalculatedMaxX] = useState(0);
  const [zal, setZal] = useState(0.1);
  const [doc, setDoc] = useState(2);
  const [feedr, setFeedr] = useState(0.25);
  const [tnf, setTnf] = useState('0202');
  const [vcf, setVcf] = useState(210);
  const [feedf, setFeedf] = useState(0.15);

  const [showPlcStack, setShowPlcStack] = useState(false);
  const [results, setResults] = useState<PLCResult[]>([]);
  const [roughGCode, setRoughGCode] = useState('');
  const [finishGCode, setFinishGCode] = useState('');
  const [finishContourGCode, setFinishContourGCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Calculate Max X from input
    const xMatches = gcode.match(/X([\d.-]+)/gi);
    if (xMatches) {
      const xValues = xMatches.map(m => parseFloat(m.slice(1)));
      const newMaxX = Math.max(...xValues, 0);
      
      // If std was matching our last calculation, keep it matched
      if (std === lastCalculatedMaxX || std === 50) {
        setStd(newMaxX);
      }
      setLastCalculatedMaxX(newMaxX);
    }
  }, [gcode]);

  useEffect(() => {
    try {
      const headerConfig = { tnr, vc, std, zal, doc, feedr, tnf, vcf, feedf, nrr };
      const parsed = parseGCode(gcode, noseRadius, ra, fa, useCommonPoint, headerConfig);
      setResults(parsed.plcRows);
      setRoughGCode(parsed.roughGCode);
      setFinishGCode(parsed.finishGCode);
      setFinishContourGCode(parsed.finishContourGCode);
    } catch (err) {
      console.error(err);
    }
  }, [gcode, noseRadius, nrr, ra, fa, useCommonPoint, tnr, vc, std, zal, doc, feedr, tnf, vcf, feedf]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullOutput = `${roughGCode}\n\n${finishGCode}\n\n${finishContourGCode}`;

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0B] text-[#D4D4D8] font-sans overflow-hidden border border-[#27272A]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] bg-[#121214]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00F5FF] flex items-center justify-center rounded-sm">
            <div className="w-4 h-4 border-2 border-[#0A0A0B]"></div>
          </div>
          <h1 className="text-lg font-bold tracking-tighter text-white">
            G-AXIS COMPILER <span className="text-[#00F5FF]/60">v1.3</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-[#71717A]">_NRR (Rough)</span>
            <input 
              type="number" step="0.001" value={nrr}
              onChange={(e) => setNrr(parseFloat(e.target.value) || 0)}
              className="bg-transparent text-[#00F5FF]/80 font-mono text-right w-14 focus:outline-none text-xs"
            />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-[#71717A]">_NR (Finish)</span>
            <input 
              type="number" step="0.001" value={noseRadius}
              onChange={(e) => setNoseRadius(parseFloat(e.target.value) || 0)}
              className="bg-transparent text-[#00F5FF] font-mono text-right w-14 focus:outline-none text-xs"
            />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-[#71717A]">_RA (Rough)</span>
            <input 
              type="number" step="0.001" value={ra}
              onChange={(e) => setRa(parseFloat(e.target.value) || 0)}
              className="bg-transparent text-amber-500 font-mono text-right w-14 focus:outline-none text-xs"
            />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-[#71717A]">_FA (Finish)</span>
            <input 
              type="number" step="0.001" value={fa}
              onChange={(e) => setFa(parseFloat(e.target.value) || 0)}
              className="bg-transparent text-emerald-500 font-mono text-right w-14 focus:outline-none text-xs"
            />
          </div>
          <div className="h-6 w-[1px] bg-[#27272A]" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-[#71717A]">Total Rough</span>
            <span className="text-xs font-mono text-white">{(nrr + ra + fa).toFixed(3)}</span>
          </div>
          <div className="h-6 w-[1px] bg-[#27272A]" />
          <button 
            onClick={() => setUseCommonPoint(!useCommonPoint)}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${
              useCommonPoint 
                ? "bg-[#00F5FF]/10 text-[#00F5FF] border-[#00F5FF]/40 shadow-[0_0_10px_rgba(0,245,255,0.2)]" 
                : "bg-transparent text-[#71717A] border-[#27272A] hover:border-[#71717A]"
            }`}
          >
            Common Point: {useCommonPoint ? "Active" : "Off"}
          </button>
          <button 
            onClick={() => setShowPlcStack(!showPlcStack)}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${
              showPlcStack 
                ? "bg-amber-500/10 text-amber-500 border-amber-500/40" 
                : "bg-transparent text-[#71717A] border-[#27272A] hover:border-[#71717A]"
            }`}
          >
            PLC Stack: {showPlcStack ? "Visible" : "Hidden"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Column: Input */}
        <section className="w-[300px] border-r border-[#27272A] flex flex-col bg-[#0F0F11]">
          <div className="p-3 bg-[#18181B] border-b border-[#27272A] flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-widest">Input Contour</span>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <textarea
              id="gcode-input"
              value={gcode}
              onChange={(e) => setGcode(e.target.value)}
              spellCheck={false}
              className="flex-1 p-6 bg-transparent font-mono text-sm leading-relaxed text-[#00F5FF]/80 focus:outline-none resize-none"
              placeholder="G1 X... Z..."
            />
          </div>
          <div className="p-4 border-t border-[#27272A] bg-[#121214]">
            <button 
              onClick={() => copyToClipboard(fullOutput)}
              className="w-full py-3 bg-[#00F5FF] text-[#0A0A0B] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white transition-colors"
            >
              {copied ? 'TRANSFERRED' : 'Calculate PLC'}
            </button>
          </div>
        </section>

        {/* Middle Column: Parameters */}
        <section className="w-[280px] border-r border-[#27272A] flex flex-col bg-[#121214]">
          <div className="p-3 bg-[#18181B] border-b border-[#27272A] flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-widest">Machining Parameters</span>
            <Settings className="w-3 h-3 text-[#71717A]" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-tighter">Machine Setup</span>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_TNR: Tool No/Offset</span>
                    <span className="text-white font-mono">{tnr}</span>
                  </label>
                  <input className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={tnr} onChange={e => setTnr(e.target.value)} placeholder="0101" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_VC: Surface Speed (S)</span>
                    <span className="text-white font-mono">{vc}</span>
                  </label>
                  <input type="number" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={vc} onChange={e => setVc(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#27272A]">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-tighter">Stock & Clearance</span>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_STD: Stock Diameter</span>
                    <button 
                      onClick={() => setStd(lastCalculatedMaxX)}
                      className="text-[#00F5FF]/60 hover:text-[#00F5FF] text-[8px] border border-[#00F5FF]/30 px-1 rounded transition-colors"
                    >
                      SYNC MAX X ({lastCalculatedMaxX})
                    </button>
                  </label>
                  <input type="number" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={std} onChange={e => setStd(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_ZAL: Z Allowance</span>
                    <span className="text-white font-mono">{zal}</span>
                  </label>
                  <input type="number" step="0.01" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={zal} onChange={e => setZal(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#27272A]">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-tighter">Cutting Profile</span>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_DOC: Depth (U)</span>
                    <span className="text-white font-mono">{doc}</span>
                  </label>
                  <input type="number" step="0.1" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={doc} onChange={e => setDoc(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_FEEDR: Rough (F)</span>
                    <span className="text-white font-mono">{feedr}</span>
                  </label>
                  <input type="number" step="0.01" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={feedr} onChange={e => setFeedr(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#27272A]">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-tighter">Finish Setup</span>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_TNF: Tool Fin</span>
                    <span className="text-white font-mono">{tnf}</span>
                  </label>
                  <input className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={tnf} onChange={e => setTnf(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_VCF: Finish Speed</span>
                    <span className="text-white font-mono">{vcf}</span>
                  </label>
                  <input type="number" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={vcf} onChange={e => setVcf(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#A1A1AA] uppercase flex justify-between">
                    <span>_FEEDF: Feed Fin</span>
                    <span className="text-white font-mono">{feedf}</span>
                  </label>
                  <input type="number" step="0.01" className="w-full bg-[#18181B] border border-[#27272A] px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00F5FF]" value={feedf} onChange={e => setFeedf(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Calculations */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className={`${showPlcStack ? 'grid grid-cols-2' : 'flex'} flex-1 min-h-0`}>
            {/* PLC Variable Stack */}
            {showPlcStack && (
              <div className="border-r border-[#27272A] flex flex-col bg-[#0c0c0e] w-full min-h-0">
                <div className="p-3 bg-[#18181B] border-b border-[#27272A] flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest">PLC Variable Stack</span>
                </div>
                <div id="plc-buffer" className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-tight space-y-4">
                  {results.map((res, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-[#71717A] text-[9px] uppercase tracking-tighter border-b border-[#27272A]/50 pb-1 mb-2">
                         {res.line}
                      </div>
                      {res.vars.replace(/[\[\]]/g, '').split(', ').map((v, vidx) => {
                        const [name, val] = v.split('=');
                        return (
                          <div key={vidx} className="flex justify-between hover:bg-[#1a1a1c] px-1 transition-colors">
                            <span className="text-[#A1A1AA]">{name}</span>
                            <span className={name === '_AN' || name === '_X' || name === '_Z' ? "text-[#00F5FF]" : "text-white"}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Path Output */}
            <div className="flex flex-col bg-[#0A0A0B] flex-1 min-w-0 min-h-0">
              <div className="p-3 bg-[#18181B] border-b border-[#27272A] flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest">Multi-Pass Path Output</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => copyToClipboard(`${roughGCode}\n\n${finishGCode}\n\n${finishContourGCode}`)}
                    className="px-2 py-0.5 bg-[#27272A] hover:bg-[#3f3f46] text-[8px] text-[#A1A1AA] uppercase font-bold tracking-widest border border-[#3f3f46] rounded transition-all"
                  >
                    COPY ALL
                  </button>
                </div>
              </div>
              <div id="output-gcode" className="flex-1 p-6 font-mono text-[11px] text-[#00F5FF] leading-relaxed bg-grid overflow-y-auto relative">
                <div className="space-y-6">
                  <div className="relative group">
                    <button 
                      onClick={() => copyToClipboard(roughGCode)}
                      className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 px-2 py-1 bg-[#27272A] text-[9px] text-[#00F5FF] rounded border border-[#00F5FF]/20 transition-all z-10"
                    >
                      COPY ROUGH
                    </button>
                    {roughGCode.split('\n').map((line, lid) => (
                      <div key={lid} className={line.startsWith('(') || line === 'G291' ? "text-amber-500 font-bold mt-2" : "opacity-90"}>{line}</div>
                    ))}
                  </div>
                  <div className="pt-6 border-t border-[#27272A] relative group">
                    <button 
                      onClick={() => copyToClipboard(finishGCode)}
                      className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 px-2 py-1 bg-[#27272A] text-[9px] text-emerald-500 rounded border border-emerald-500/20 transition-all z-10"
                    >
                      COPY FINISH
                    </button>
                    {finishGCode.split('\n').map((line, lid) => (
                      <div key={lid} className={line.startsWith('(') ? "text-emerald-500 font-bold mt-2" : "opacity-80"}>{line}</div>
                    ))}
                  </div>
                  <div className="pt-6 border-t border-[#27272A] pb-20 relative group">
                    <button 
                      onClick={() => copyToClipboard(finishContourGCode)}
                      className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 px-2 py-1 bg-[#27272A] text-[9px] text-[#00F5FF] rounded border border-[#00F5FF]/20 transition-all z-10"
                    >
                      COPY CONTOUR
                    </button>
                    {finishContourGCode.split('\n').map((line, lid) => (
                      <div key={lid} className={line.startsWith('(') ? "text-[#00F5FF] font-bold mt-2" : "opacity-70"}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Internal Status */}
              <div className="p-4 border-t border-[#27272A] bg-[#121214] flex gap-2">
                <div className="w-full flex items-center justify-between px-3 py-2 bg-[#18181B] border border-[#27272A] text-[10px] text-[#71717A]">
                  <span className="uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#00F5FF] rounded-full animate-pulse"></div>
                    Status: {results.length > 0 ? "CALCULATION COMPLETE" : "READY"}
                  </span>
                  <span className="font-mono">CYCLE: 4ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Matrix */}
          <div className="h-[120px] border-t border-[#27272A] bg-[#0C0C0E] p-6">
            <div className="grid grid-cols-4 gap-6 h-full">
              <div className="col-span-3">
                <div className="flex gap-12">
                   <div className="space-y-1">
                      <div className="text-[10px] text-[#71717A] uppercase tracking-widest">Compiler Engine</div>
                      <div className="text-sm text-white font-bold tracking-tight">SI-ISO VECTOR CORE</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] text-[#71717A] uppercase tracking-widest">Active Cycle</div>
                      <div className="text-sm text-[#00F5FF] font-bold tracking-tight">G71 ROUGHING</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] text-[#71717A] uppercase tracking-widest">Compatibility</div>
                      <div className="text-sm text-white/50 font-bold tracking-tight">FANUC / SIEMENS</div>
                   </div>
                </div>
              </div>

              <div className="flex flex-col justify-end gap-1 pb-2">
                <div className="flex justify-between items-end border-b border-[#27272A] pb-1">
                  <div className="text-[9px] text-[#71717A] uppercase tracking-widest">Version</div>
                  <div className="text-[10px] text-white uppercase font-bold tracking-tighter">1.4-STABLE</div>
                </div>
                <div className="flex justify-between items-end border-b border-[#27272A] pb-1">
                  <div className="text-[9px] text-[#71717A] uppercase tracking-widest">Build</div>
                  <div className="text-[10px] text-[#00F5FF] uppercase font-bold tracking-tighter">SUCCESS</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-8 px-6 bg-[#00F5FF] text-[#0A0A0B] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span>System Ready: Axis Synchronized</span>
          <span className="opacity-50">|</span>
          <span>Load: Stable</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Buffer: 1024 KB</span>
          <Cpu className="w-3 h-3" />
        </div>
      </footer>
    </div>
  );
}
