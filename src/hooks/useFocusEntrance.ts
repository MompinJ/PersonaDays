// useFocusEntrance — reproduce la animacion de entrada CADA vez que la pantalla
// gana foco (no solo al montar). Filosofia Persona: corte abrupto + los
// componentes entran con caracter en cada navegacion.
import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export const useFocusEntrance = (distance = 16, duration = 420) => {
  const intro = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      intro.setValue(0);
      const anim = Animated.timing(intro, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      anim.start();
      return () => { anim.stop(); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration])
  );

  // Solo deslizamiento (sin fade de opacidad): asi la pantalla NUNCA queda
  // invisible. El fade chocaba con la transicion del stack (pop), dejando ver
  // un frame de fondo solido. El translateY da el "settle" sin ese problema.
  const style = {
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };

  return { intro, style };
};

export default useFocusEntrance;
