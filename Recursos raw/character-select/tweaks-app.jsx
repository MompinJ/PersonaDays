// Tweaks for the P3R character select. The carousel runs in vanilla JS;
// this little React app only drives the tweakable CSS variables on #stage.
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "loudness": "Poster",
  "glow": 100,
  "bgName": true,
  "bgNameOpacity": 13,
  "skew": 9,
  "ribbons": true,
  "tagline": true,
  "nameFont": "Anton"
}/*EDITMODE-END*/;

const NAME_FONTS = {
  "Anton": "'Anton'",
  "Bebas Neue": "'Bebas Neue'",
  "Big Shoulders": "'Big Shoulders Display'"
};

// loudness presets nudge several dials at once
const LOUD = {
  "Limpia":  { glow: 45,  bgName: false, bgNameOpacity: 6,  ribbons: false },
  "Media":   { glow: 75,  bgName: true,  bgNameOpacity: 9,  ribbons: true  },
  "Poster":  { glow: 100, bgName: true,  bgNameOpacity: 13, ribbons: true  }
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    const s = document.getElementById('stage');
    if (!s) return;
    s.style.setProperty('--glow-mult', (t.glow / 100).toFixed(2));
    s.style.setProperty('--bgname-op', t.bgName ? (t.bgNameOpacity / 100).toFixed(3) : '0');
    s.style.setProperty('--skew', '-' + t.skew + 'deg');
    s.style.setProperty('--tagline-show', t.tagline ? '1' : '0');
    s.style.setProperty('--name-font', NAME_FONTS[t.nameFont] || "'Anton'");
    document.querySelectorAll('.ribbon').forEach(function (r) {
      r.style.display = t.ribbons ? '' : 'none';
    });
  }, [t]);

  function setLoud(v) {
    const p = LOUD[v];
    setTweak({ loudness: v, ...p });
  }

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Intensidad" />
      <TweakRadio label="Loudness" value={t.loudness}
        options={["Limpia", "Media", "Poster"]} onChange={setLoud} />
      <TweakSlider label="Glow" value={t.glow} min={0} max={200} step={5} unit="%"
        onChange={(v) => setTweak('glow', v)} />

      <TweakSection label="Tipografía de fondo" />
      <TweakToggle label="Nombre gigante" value={t.bgName}
        onChange={(v) => setTweak('bgName', v)} />
      <TweakSlider label="Opacidad" value={t.bgNameOpacity} min={0} max={28} step={1} unit="%"
        onChange={(v) => setTweak('bgNameOpacity', v)} />
      <TweakToggle label="Cintas diagonales" value={t.ribbons}
        onChange={(v) => setTweak('ribbons', v)} />

      <TweakSection label="Nameplate" />
      <TweakSelect label="Fuente del nombre" value={t.nameFont}
        options={["Anton", "Bebas Neue", "Big Shoulders"]}
        onChange={(v) => setTweak('nameFont', v)} />
      <TweakSlider label="Inclinación" value={t.skew} min={0} max={16} step={1} unit="°"
        onChange={(v) => setTweak('skew', v)} />
      <TweakToggle label="Mostrar tagline" value={t.tagline}
        onChange={(v) => setTweak('tagline', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
