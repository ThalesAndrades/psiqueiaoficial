// Minimal ambient declarations for @daily-co/react-native-daily-js and
// the native Health SDKs. These shims exist so `tsc --noEmit` succeeds in
// CI and worktrees that haven't run `pnpm install` against the new
// dependencies yet. Once the packages are installed the real types from
// node_modules will take precedence (TypeScript prefers .d.ts shipped
// with installed packages over ambient declarations of the same name).

declare module '@daily-co/react-native-daily-js' {
  const Daily: any;
  export const DailyMediaView: any;
  export default Daily;
}

declare module 'react-native-health' {
  const AppleHealthKit: any;
  export type HealthInputOptions = any;
  export type HealthValue = any;
  export default AppleHealthKit;
}

declare module 'react-native-health-connect' {
  export function initialize(): Promise<boolean>;
  export function requestPermission(permissions: any[]): Promise<any[]>;
  export function getGrantedPermissions(): Promise<any[]>;
  export function readRecords(recordType: string, options: any): Promise<any>;
  export function openHealthConnectSettings(): Promise<void>;
}
