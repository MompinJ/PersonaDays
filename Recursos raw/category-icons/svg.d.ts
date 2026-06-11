// Tipado de los imports `*.svg` cuando se usan como componentes
// (react-native-svg-transformer). Si ya tienes esta declaración global
// en tu proyecto (p.ej. por stats-ui / nav-icons), borra este archivo.
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
