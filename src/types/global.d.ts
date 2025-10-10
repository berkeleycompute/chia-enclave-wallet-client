// Ambient declaration to satisfy TS in environments where BigInt lib types
// are not picked up by the build toolchain.
declare function BigInt(value: any): any;


// Minimal module declarations to satisfy local type checking for Flowbite React
declare module 'flowbite-react' {
  export const Modal: any;
  export const Button: any;
  export const TextInput: any;
  export const Label: any;
  export const Spinner: any;
  export const Alert: any;
}

