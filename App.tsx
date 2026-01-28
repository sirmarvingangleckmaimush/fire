
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { CollectionMethod, SimulationResult, VeritasMath, SequestrationBlock, VaultState, SequestrationTransaction, ChatMessage } from './types';
import { analyzeSimulation, chatWithGemini, analyzeMedia, editImage, groundedSearch, quickReasoning } from './services/geminiService';
import FluxVisualizer from './components/FluxVisualizer';
import { deriveWIF, validateWIF, signSequestrationTx, deriveAddressFromWIF } from './utils/crypto';

const App: React.FC = () => {
  // Core Dashboard State
  const [method, setMethod] = useState<CollectionMethod>(CollectionMethod.STOCHASTIC_FLUX);
  const [data, setData] = useState<SimulationResult[]>([]);
  const [mempool, setMempool] = useState<SequestrationBlock[]>([]);
  const [activeTx, setActiveTx] = useState<SequestrationTransaction | null>(null);
  const [txHistory, setTxHistory] = useState<SequestrationTransaction[]>([]);
  
  // Modals & UI States
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isConfirmingBroadcast, setIsConfirmingBroadcast] = useState(false);
  const [recoveryWif, setRecoveryWif] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [vault, setVault] = useState<VaultState>({
    address: 'GENERATING...', wif: 'DERIVING...', totalBalance: 0,
    lastConsolidation: Date.now(), isRecovering: false, isWifValid: false
  });
  const [insight, setInsight] = useState<string>("Veritas Engine 4.3 online. BTC Truth Protocol Active. Calibration: Ψ = 958.312108.");
  
  // AI Feature States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{text: string, sources: any[]} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [isAnalyzingMedia, setIsAnalyzingMedia] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);

  // Auto-Collect Toggle
  const [isAutoCollect, setIsAutoCollect] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Initialize Vault on Mount
  const initVault = useCallback(async () => {
    const seed = Math.random().toString() + Date.now().toString();
    const wif = await deriveWIF(seed);
    const addr = await deriveAddressFromWIF(wif);
    setVault(prev => ({ ...prev, address: addr, wif, isWifValid: true }));
  }, []);

  useEffect(() => {
    initVault();
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) setHasKey(await aiStudio.hasSelectedApiKey());
    };
    checkKey();
  }, [initVault]);

  // Simulation Tick Logic
  const generateMempoolBlock = useCallback(() => {
    const id = Math.random().toString(36).substring(7).toUpperCase();
    const hash = Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const carbonSaved = method === CollectionMethod.STOCHASTIC_FLUX ? Math.random() * 2.2 : Math.random() * 0.8;
    
    setMempool(prev => [{
      id, hash, carbonSaved, method, timestamp: Date.now()
    }, ...prev].slice(0, 10));
  }, [method]);

  const generateStep = useCallback(() => {
    setData(prev => {
      const last = prev[prev.length - 1] || { timestamp: 0, co2Level: 420, dustDensity: 100, efficiency: 85, entropy: 1 };
      const multiplier = method === CollectionMethod.STOCHASTIC_FLUX ? 1.45 : 0.95;
      const next: SimulationResult = {
        timestamp: last.timestamp + 1,
        co2Level: Math.max(380, last.co2Level - (0.4 * multiplier) + (Math.random() - 0.5)),
        dustDensity: Math.max(5, last.dustDensity - (0.7 * multiplier) + (Math.random() - 0.5)),
        efficiency: Math.min(99.9, last.efficiency + (0.05 * multiplier * Math.random())),
        entropy: last.entropy + (method === CollectionMethod.ORDINAL ? 0.02 : 0.008)
      };
      if (Math.random() > 0.85) generateMempoolBlock();
      return [...prev, next].slice(-40);
    });
  }, [method, generateMempoolBlock]);

  useEffect(() => {
    timerRef.current = window.setInterval(generateStep, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [generateStep]);

  // AI Logic handlers
  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user' as const, text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);
    try {
      const response = await chatWithGemini(chatInput, chatHistory);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'model', text: `CHAT_ERROR: ${e.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await groundedSearch(searchQuery);
      setSearchResult(result);
    } catch (e: any) {
      setSearchResult({ text: `SEARCH_ERROR: ${e.message}`, sources: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // Transaction Workflow
  const prepareSequestrationTx = async () => {
    const pending = mempool.reduce((acc, curr) => acc + curr.carbonSaved, 0);
    if (pending <= 0) return;
    setVault(prev => ({ ...prev, isRecovering: true }));
    setInsight("STAGING TRANSACTION: Calculating script hash and gathering UTXO dust...");
    try {
      const signed = await signSequestrationTx(vault.wif, pending, vault.address);
      const newTx: SequestrationTransaction = {
        txid: signed.txid, raw: signed.raw, signature: signed.signature,
        isSigned: true, amount: pending, timestamp: Date.now()
      };
      setActiveTx(newTx);
      setInsight(`TX_STAGED: ${signed.txid.substring(0, 12)}... Waiting for explicit broadcast confirmation. FUCKAAAAA KAKAKAK.`);
      if (!isAutoCollect) setIsConfirmingBroadcast(true);
    } catch (e: any) {
      setInsight(`SIGNING_ERROR: ${e.message}`);
    } finally {
      setTimeout(() => setVault(prev => ({ ...prev, isRecovering: false })), 500);
    }
  };

  const broadcastTransaction = async () => {
    if (!activeTx) return;
    setIsConfirmingBroadcast(false);
    setIsBroadcasting(true);
    setInsight("BROADCASTING: Transmitting signed hex payload to global Ecoflux mainnet nodes...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setTxHistory(prev => [activeTx, ...prev].slice(0, 20));
    setVault(prev => ({ 
      ...prev, 
      totalBalance: prev.totalBalance + activeTx.amount, 
      lastConsolidation: Date.now() 
    }));
    setMempool([]);
    setActiveTx(null);
    setIsBroadcasting(false);
    setInsight(`TX_SETTLED: ${activeTx.txid.substring(0, 12)}... Verify on mempool.space. Truth verified.`);
  };

  // Auto-Collect Automation
  useEffect(() => {
    if (isAutoCollect && mempool.length >= 5 && !activeTx && !vault.isRecovering && !isBroadcasting && vault.isWifValid) {
       prepareSequestrationTx();
    }
  }, [mempool, isAutoCollect, activeTx, vault.isRecovering, isBroadcasting, vault.isWifValid]);

  useEffect(() => {
    if (isAutoCollect && activeTx && !isBroadcasting) {
      const timer = setTimeout(broadcastTransaction, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeTx, isAutoCollect, isBroadcasting]);

  const handleRecover = async () => {
    setRecoveryError(null);
    try {
      const isValid = await validateWIF(recoveryWif);
      if (!isValid) { setRecoveryError("IDENTITY_FAIL: Corrupt checksum."); return; }
      const addr = await deriveAddressFromWIF(recoveryWif);
      setVault(prev => ({ ...prev, address: addr, wif: recoveryWif, isWifValid: true }));
      setIsRecoveryOpen(false); setRecoveryWif('');
    } catch (e: any) { setRecoveryError(`EXCEPTION: ${e.message}`); }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 selection:bg-orange-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-orange-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 blur-[120px] rounded-full"></div>
      </div>

      <header className="z-10 bg-slate-900/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-500 bg-clip-text text-transparent italic">₿ VERITAS ECOFLUX v4.3</h1>
          <div className="flex gap-4 items-center mt-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            <span className="text-slate-400 text-xs mono uppercase tracking-widest">BTC_ENGINE: ONLINE</span>
            {!hasKey && (
              <button onClick={() => (window as any).aistudio?.openSelectKey()} className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded animate-pulse font-black uppercase">PAID_KEY_REQ</button>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => analyzeSimulation(data).then(setInsight)} className="bg-orange-600 hover:bg-orange-500 text-slate-950 font-black px-6 py-2 rounded-xl text-xs uppercase shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all">ENGINEERING_THINK_ANALYSIS</button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 z-10 flex-grow">
        
        {/* Column 1: Vault & Stats */}
        <div className="flex flex-col gap-6">
          <section className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-lg border-t-orange-500 border-t-4">
             <div className="flex justify-between items-start mb-4">
                <h2 className="text-sm font-black uppercase text-orange-400 italic">Vault Controller</h2>
                <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 mono">AUTO</span>
                    <button onClick={() => setIsAutoCollect(!isAutoCollect)} className={`w-8 h-4 rounded-full relative transition-all ${isAutoCollect ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isAutoCollect ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                </div>
             </div>
             
             <div className="bg-black/40 p-3 rounded-xl border border-slate-800 mb-6 relative overflow-hidden group">
                <div className="text-[9px] text-slate-500 mb-1 mono uppercase font-bold tracking-widest">PUB_P2PKH_ADDRESS</div>
                <div className="mono text-[11px] text-orange-500 break-all font-black leading-tight">{vault.address}</div>
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[8px] text-slate-600 mono font-black">SECURE</span>
                </div>
             </div>

             <div className="flex justify-between items-end mb-6">
                <div>
                   <div className="text-3xl font-black text-slate-100 tracking-tighter">{vault.totalBalance.toFixed(6)}</div>
                   <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest italic">BTC SEQUESTERED TONNES</div>
                </div>
                <button onClick={() => setIsRecoveryOpen(true)} className="text-[9px] text-slate-600 hover:text-cyan-400 mono font-black transition-colors uppercase">Recover Key</button>
             </div>

             <button 
               onClick={prepareSequestrationTx}
               disabled={vault.isRecovering || mempool.length === 0 || !!activeTx || isBroadcasting}
               className={`w-full py-4 rounded-2xl font-black text-xs transition-all uppercase tracking-widest italic ${isAutoCollect ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-xl hover:shadow-orange-900/40'} active:scale-95 disabled:opacity-20`}
             >
               {isAutoCollect ? 'Automatic Collection Running' : 'Manual Consolidation'}
             </button>
          </section>

          <section className="bg-slate-900/60 p-1 rounded-3xl border border-slate-800 shadow-lg h-56 overflow-hidden">
            <FluxVisualizer method={method} />
          </section>

          <section className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-lg">
             <h2 className="text-sm font-black uppercase text-cyan-400 italic mb-4">Media Analytics</h2>
             <div className="flex flex-col gap-4">
                <label className="w-full h-24 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center cursor-pointer hover:border-cyan-500/50 bg-black/20 overflow-hidden">
                  <input type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { const r = new FileReader(); r.onloadend = () => setMediaFile(r.result as string); r.readAsDataURL(f); }
                  }} />
                  {mediaFile ? <img src={mediaFile} className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-600 font-black uppercase mono">Load Sequestration Map</span>}
                </label>
                <div className="flex gap-2">
                   <button onClick={() => analyzeMedia(mediaFile!.split(',')[1], mediaFile!.split(',')[0].split(':')[1].split(';')[0], "Deep analysis of this asset.").then(setInsight)} disabled={!mediaFile} className="flex-1 bg-slate-800 py-2 rounded-lg text-[9px] font-black uppercase disabled:opacity-30">Analyze Pro</button>
                   <button onClick={() => editImage(mediaFile!.split(',')[1], mediaFile!.split(',')[0].split(':')[1].split(';')[0], editPrompt).then(res => res && setMediaFile(res))} disabled={!mediaFile || !editPrompt} className="flex-1 bg-orange-900/40 py-2 rounded-lg text-[9px] font-black uppercase disabled:opacity-30">Mutation</button>
                </div>
                <input type="text" placeholder="Mutation Prompt..." value={editPrompt} onChange={e => setEditPrompt(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] text-orange-400 focus:outline-none" />
             </div>
          </section>
        </div>

        {/* Column 2: Data Visuals */}
        <div className="xl:col-span-2 flex flex-col gap-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between group overflow-hidden relative">
                 <span className="text-[10px] font-black text-slate-500 uppercase italic">CO2 Concentration</span>
                 <div className="text-4xl font-black text-orange-400 tracking-tighter mt-1">{data[data.length-1]?.co2Level.toFixed(2)} ppm</div>
                 <div className="absolute -bottom-2 -right-2 text-6xl text-orange-500/5 font-black rotate-12">Ψ</div>
              </div>
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between overflow-hidden">
                 <span className="text-[10px] font-black text-slate-500 uppercase italic">Langevin Efficiency</span>
                 <div className="text-4xl font-black text-cyan-400 tracking-tighter mt-1">{data[data.length-1]?.efficiency.toFixed(3)}%</div>
              </div>
           </div>

           <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 h-[340px] relative overflow-hidden">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="1 8" stroke="#1e293b" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                  <Area type="step" dataKey="co2Level" stroke="#f97316" strokeWidth={5} fill="#f97316" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="efficiency" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.02} />
                </AreaChart>
             </ResponsiveContainer>
           </div>

           <section className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-lg flex-grow flex flex-col">
              <h2 className="text-xs font-black uppercase text-cyan-500 mb-4 flex items-center gap-2 italic">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"></span>
                Truth_Engine Output
              </h2>
              <div className="flex-grow overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                <div className="text-sm leading-relaxed text-slate-300 font-serif italic opacity-90 whitespace-pre-wrap">{insight}</div>
              </div>
           </section>

           <section className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-lg">
             <h2 className="text-xs font-black uppercase text-yellow-500 mb-4 italic">Grounded Global Search (3 Flash)</h2>
             <div className="flex gap-2">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} type="text" placeholder="Query market fluctuations, news..." className="flex-grow bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none" />
                <button onClick={handleSearch} disabled={isSearching} className="bg-yellow-600 text-slate-950 font-black px-6 py-2 rounded-2xl text-xs uppercase hover:bg-yellow-500 transition-colors">Go</button>
             </div>
             {searchResult && (
               <div className="mt-4 animate-in slide-in-from-bottom duration-300">
                  <div className="text-xs text-slate-400 mb-2 italic leading-relaxed">{searchResult.text}</div>
                  <div className="flex flex-wrap gap-2">
                     {searchResult.sources.map((s, i) => (
                       <a key={i} href={s.web?.uri} target="_blank" className="text-[9px] bg-slate-800 text-cyan-400 px-2 py-1 rounded border border-cyan-900/50 hover:border-cyan-500/50 transition-colors">{s.web?.title}</a>
                     ))}
                  </div>
               </div>
             )}
           </section>
        </div>

        {/* Column 3: Chat & History */}
        <div className="flex flex-col gap-6">
           <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-[480px]">
              <h2 className="text-sm font-black uppercase text-orange-400 mb-6 italic">Veritas_Chat (3 Pro)</h2>
              <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-1 custom-scrollbar">
                {chatHistory.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${m.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>{m.text}</div>
                    <span className="text-[8px] mono text-slate-600 mt-1 uppercase font-black">{m.role}</span>
                  </div>
                ))}
                {isChatting && <div className="text-[10px] mono text-orange-500 animate-pulse italic">Thinking_Through_Problem...</div>}
              </div>
              <div className="flex gap-2">
                 <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} type="text" placeholder="Command..." className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500" />
                 <button onClick={handleChat} className="bg-orange-600 p-2 rounded-xl text-white hover:bg-orange-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </button>
              </div>
           </section>

           <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col flex-grow relative overflow-hidden">
              <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-6 italic">On-Chain_History</h2>
              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar max-h-[400px]">
                {txHistory.length === 0 && <div className="text-center py-20 text-slate-800 text-[10px] mono uppercase">No settled records</div>}
                {txHistory.map((tx) => (
                  <div key={tx.txid} className="p-4 bg-black/40 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-all border-l-2 border-l-emerald-500 group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-emerald-400">+{tx.amount.toFixed(6)} T</span>
                      <a 
                        href={`https://mempool.space/tx/${tx.txid}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-all uppercase mono"
                      >
                        Mempool.space
                      </a>
                    </div>
                    <div className="text-[8px] text-slate-500 mono truncate mt-1">TXID: {tx.txid}</div>
                  </div>
                ))}
              </div>
           </section>
        </div>
      </div>

      {/* Manual Broadcast Confirmation Modal */}
      {isConfirmingBroadcast && activeTx && !isAutoCollect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
           <div className="bg-slate-900 border-4 border-orange-500 p-10 rounded-[56px] shadow-[0_0_120px_rgba(249,115,22,0.3)] max-w-xl w-full relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-[180px] font-black text-orange-500 opacity-5 select-none rotate-12">₿</div>
              <h2 className="text-4xl font-black text-white mb-6 italic uppercase tracking-tighter">Confirm Execution</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed italic">You are about to commit a signed sequestration payload to the on-chain ledger. This action is immutable and irreversible in the physical realm.</p>
              
              <div className="space-y-6 mb-10">
                 <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 border-l-4 border-l-orange-500">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Yield Payload</div>
                    <div className="text-5xl font-black text-orange-400 tracking-tighter italic">+{activeTx.amount.toFixed(6)} <span className="text-xl">TONNES</span></div>
                 </div>
                 <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-2">RAW_TRANSACTION_HEX</div>
                    <div className="text-[9px] text-slate-400 font-mono break-all max-h-32 overflow-y-auto custom-scrollbar leading-tight bg-slate-900/50 p-2 rounded border border-slate-800">{activeTx.raw}</div>
                 </div>
                 <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800">
                    <div className="text-[10px] font-black text-slate-500 uppercase mb-2">TARGET_BTC_EXPLORER</div>
                    <div className="text-[10px] text-slate-400 font-black mono break-all">https://mempool.space/tx/{activeTx.txid}</div>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button onClick={broadcastTransaction} disabled={isBroadcasting} className={`w-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-black py-6 rounded-3xl text-xl shadow-[0_0_40px_rgba(249,115,22,0.5)] transition-all active:scale-95 uppercase italic ${isBroadcasting ? 'animate-pulse' : ''}`}>
                    {isBroadcasting ? 'Broadcasting...' : 'Confirm & Finalize Broadcast'}
                 </button>
                 <button onClick={() => { setActiveTx(null); setIsConfirmingBroadcast(false); }} disabled={isBroadcasting} className="w-full py-4 text-slate-600 hover:text-slate-300 font-black uppercase tracking-widest transition-colors text-xs">Abort Sequence</button>
              </div>
           </div>
        </div>
      )}

      {/* Recovery Identity Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[48px] shadow-2xl max-w-lg w-full border-t-cyan-500 border-t-8">
            <h2 className="text-2xl font-black text-white mb-4 italic uppercase">Identity Recovery</h2>
            <p className="text-slate-500 text-xs mb-6 uppercase mono leading-relaxed tracking-tighter">Provide Base58 WIF Key. Identity will be scrubbed and re-initialized. Calibration preserved.</p>
            {recoveryError && <div className="text-red-500 text-[10px] mb-4 font-black mono uppercase">FAIL: {recoveryError}</div>}
            <textarea value={recoveryWif} onChange={e => setRecoveryWif(e.target.value.trim())} placeholder="KzFB9XMay..." className="w-full h-24 bg-black/60 border border-slate-800 rounded-2xl p-4 text-xs mono text-cyan-400 mb-6 focus:border-cyan-500/50 outline-none" />
            <div className="flex gap-4">
              <button onClick={handleRecover} className="flex-grow bg-cyan-600 py-4 rounded-2xl font-black text-white hover:bg-cyan-500 transition-all active:scale-95">Re-Calibrate</button>
              <button onClick={() => setIsRecoveryOpen(false)} className="px-8 bg-slate-800 rounded-2xl font-black text-slate-400 hover:bg-slate-700 transition-all">Abort</button>
            </div>
          </div>
        </div>
      )}

      <footer className="z-10 bg-slate-900/40 py-3 px-6 rounded-2xl border border-slate-800/50 flex items-center gap-8 overflow-hidden backdrop-blur-sm">
         <div className="flex-shrink-0 whitespace-nowrap mono text-[10px] text-slate-500 tracking-tighter animate-marquee uppercase font-black">
           VERITAS_ENGINE_v4.3 | EXPLORER_LINK: ACTIVE | MEMPOOL_SYNC: ENABLED | AUTO_COLLECT: {isAutoCollect ? 'ON' : 'OFF'} | PSY_CALIBRATION: 958.312108 | FUCKAAAAA KAKAKAK
         </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: inline-block; animation: marquee 30s linear infinite; }
      `}</style>
    </div>
  );
};

export default App;
