// Tipado de los imports `*.svg` como componentes (react-native-svg-transformer).
// Si ya lo tienes global en el proyecto, borra este archivo.
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
