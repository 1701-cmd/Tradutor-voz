import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Copy, Mic, Volume2, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { translateOffline, getSupportedLanguages } from '@/lib/offlineTranslations';

export default function Home() {
  const [activeTab, setActiveTab] = useState('voice');
  const [sourceLang, setSourceLang] = useState('pt-BR');
  const [targetLang, setTargetLang] = useState('en-US');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translationMethod, setTranslationMethod] = useState<'offline' | 'online'>('offline');
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<any>(null);

  const languages = getSupportedLanguages();

  // Inicializar Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputText(text);
        handleTranslate(text);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsListening(false);
      };
    }

    synthesisRef.current = window.speechSynthesis;

    // Monitorar status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Traduzir texto
  const handleTranslate = async (text: string) => {
    if (!text.trim()) {
      setOutputText('');
      return;
    }

    // Tentar tradução offline primeiro
    const offlineResult = translateOffline(text, sourceLang, targetLang);
    if (offlineResult) {
      setOutputText(offlineResult);
      setTranslationMethod('offline');
      return;
    }

    // Se offline ou falhar, tentar API online
    if (isOnline) {
      try {
        const from = sourceLang.split('-')[0];
        const to = targetLang.split('-')[0];
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
        );
        const data = await response.json();
        if (data.responseData?.translatedText) {
          setOutputText(data.responseData.translatedText);
          setTranslationMethod('online');
        }
      } catch (error) {
        console.error('Erro na tradução online:', error);
        setOutputText('Erro ao traduzir. Tente novamente.');
      }
    } else {
      setOutputText('Modo offline: tradução limitada ao dicionário local');
    }
  };

  // Iniciar reconhecimento de voz
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = sourceLang;
      recognitionRef.current.start();
    }
  };

  // Falar tradução
  const speakTranslation = () => {
    if (!outputText || outputText.includes('Erro') || outputText.includes('offline')) return;

    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(outputText);
    utterance.lang = targetLang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  // Copiar tradução
  const copyToClipboard = () => {
    if (outputText && !outputText.includes('Erro')) {
      navigator.clipboard.writeText(outputText);
    }
  };

  // Trocar idiomas
  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  // Limpar
  const clear = () => {
    setInputText('');
    setOutputText('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Tradutor Profissional</h1>
          <p className="text-slate-400">Tradução offline e online com voz</p>
        </div>

        {/* Status Online/Offline */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-medium">Offline (Limitado)</span>
              </>
            )}
          </div>
          {translationMethod && (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-700 text-slate-300">
              {translationMethod === 'offline' ? '🔒 Offline' : '☁️ Online'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-800">
            <TabsTrigger value="voice" className="data-[state=active]:bg-blue-600">
              🎤 Voz
            </TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-blue-600">
              ⌨️ Texto
            </TabsTrigger>
            <TabsTrigger value="camera" className="data-[state=active]:bg-blue-600">
              📷 Câmera
            </TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-blue-600">
              🖼️ Galeria
            </TabsTrigger>
          </TabsList>

          {/* Aba Voz */}
          <TabsContent value="voice" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="space-y-4">
                {/* Seleção de Idiomas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      De:
                    </label>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Para:
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botão Falar */}
                <Button
                  onClick={startListening}
                  disabled={isListening}
                  className="w-full py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  {isListening ? 'Ouvindo...' : '🎤 FALAR'}
                </Button>

                {/* Texto Reconhecido */}
                {inputText && (
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <p className="text-sm text-slate-400 mb-1">Texto reconhecido:</p>
                    <p className="text-white">{inputText}</p>
                  </div>
                )}

                {/* Tradução */}
                {outputText && (
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <p className="text-sm text-slate-400 mb-1">Tradução:</p>
                    <p className="text-white text-lg">{outputText}</p>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={speakTranslation}
                    disabled={!outputText || isSpeaking}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    disabled={!outputText}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={clear}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Aba Texto */}
          <TabsContent value="text" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="space-y-4">
                {/* Seleção de Idiomas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      De:
                    </label>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Para:
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Área de Texto */}
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    handleTranslate(e.target.value);
                  }}
                  placeholder="Digite ou fale aqui..."
                  className="w-full h-32 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                {/* Botão Trocar */}
                <Button
                  onClick={swapLanguages}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  ⇄ Trocar Idiomas
                </Button>

                {/* Tradução */}
                {outputText && (
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <p className="text-sm text-slate-400 mb-2">Tradução:</p>
                    <p className="text-white text-lg">{outputText}</p>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={speakTranslation}
                    disabled={!outputText || isSpeaking}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    disabled={!outputText}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={clear}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Aba Câmera */}
          <TabsContent value="camera">
            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <p className="text-slate-400 mb-4">Câmera requer conexão online</p>
              <p className="text-slate-500 text-sm">
                Este recurso permite capturar texto de imagens em tempo real e traduzir.
              </p>
            </Card>
          </TabsContent>

          {/* Aba Galeria */}
          <TabsContent value="gallery">
            <Card className="bg-slate-800 border-slate-700 p-6 text-center">
              <p className="text-slate-400 mb-4">Galeria requer conexão online</p>
              <p className="text-slate-500 text-sm">
                Este recurso permite selecionar imagens da galeria e extrair texto para traduzir.
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Tradução offline com dicionário local • Suporte a voz e texto</p>
          <p className="mt-2">Câmera e Galeria disponíveis apenas online</p>
        </div>
      </div>
    </div>
  );
}
