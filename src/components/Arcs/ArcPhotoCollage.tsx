import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { getArcPhotos, ArcPhotoView } from '../../services/arcPhotoService';

// Collage de hasta N fotos del arco: elige fotos DISTINTAS al azar (sin repetir)
// y las esparce en posiciones predefinidas con jitter y rotacion variada, estilo
// polaroid regado. Cada foto conserva su PROPORCION original (no se recorta a
// cuadro): se escala manteniendo el aspecto hasta un lado maximo. Cambia cada
// vez que se monta la tarjeta.

// Posiciones base (fraccion 0..1 del area libre, esquina sup-izq de cada foto).
// Repartidas en las esquinas + centro para que 5 fotos queden regadas sin
// amontonarse, aprovechando el alto disponible.
const SLOTS = [
  { x: 0.04, y: 0.02 },
  { x: 0.96, y: 0.14 },
  { x: 0.34, y: 0.42 },
  { x: 0.92, y: 0.70 },
  { x: 0.06, y: 0.84 },
];

// Lado mayor (px) al que se escala cada foto manteniendo su aspecto.
const MAX_SIDE = 140;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getDims = (uri: string): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    Image.getSize(uri, (w, h) => resolve({ w, h }), () => resolve({ w: 1, h: 1 }));
  });

interface Placed { photo: ArcPhotoView; w: number; h: number; slotX: number; slotY: number; rot: number }

const ArcPhotoCollage = ({ idArco, maxPhotos = 5, style }: { idArco: number; maxPhotos?: number; style?: any }) => {
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [area, setArea] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const all = await getArcPhotos(idArco).catch(() => [] as ArcPhotoView[]);
      const exist = (all || []).filter((p) => p.exists);
      if (!mounted || exist.length === 0) return;
      // Fotos distintas al azar (sin repetir), tantas como haya hasta maxPhotos.
      const pick = shuffle(exist).slice(0, Math.min(maxPhotos, exist.length, SLOTS.length));
      const dims = await Promise.all(pick.map((p) => getDims(p.uri)));
      if (!mounted) return;
      const layout: Placed[] = pick.map((photo, i) => {
        const d = dims[i];
        // Escalar manteniendo aspecto: el lado mayor = MAX_SIDE.
        const scale = MAX_SIDE / Math.max(d.w, d.h);
        return {
          photo,
          w: Math.round(d.w * scale),
          h: Math.round(d.h * scale),
          slotX: clamp01(SLOTS[i].x + (Math.random() - 0.5) * 0.12),
          slotY: clamp01(SLOTS[i].y + (Math.random() - 0.5) * 0.10),
          rot: Math.round((Math.random() - 0.5) * 32), // -16..16 grados
        };
      });
      setPlaced(layout);
    })();
    return () => { mounted = false; };
  }, [idArco, maxPhotos]);

  if (placed.length === 0) return null;

  const ready = area.w > 0 && area.h > 0;

  return (
    <View
      style={[styles.area, style]}
      onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {ready && placed.map((p, i) => (
        <Image
          key={p.photo.id_foto}
          source={{ uri: p.photo.uri }}
          resizeMode="cover"
          style={[
            styles.photo,
            {
              width: p.w,
              height: p.h,
              left: clamp01(p.slotX) * Math.max(0, area.w - p.w),
              top: clamp01(p.slotY) * Math.max(0, area.h - p.h),
              zIndex: i,
              transform: [{ rotate: `${p.rot}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  area: { width: '100%', position: 'relative', overflow: 'visible' },
  photo: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 3,
    borderColor: '#F2F2F2',
    backgroundColor: '#F2F2F2',
    // Sombra para despegar las fotos del fondo (efecto polaroid regado)
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default ArcPhotoCollage;
