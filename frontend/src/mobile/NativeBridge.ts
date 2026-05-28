/**
 * Mobile Platform Bridge
 * Abstração para acessar features nativas Android/iOS via Capacitor
 */

import { Capacitor } from '@capacitor/core';

export class MobilePlatform {
  private static instance: MobilePlatform;

  private constructor() {}

  public static getInstance(): MobilePlatform {
    if (!MobilePlatform.instance) {
      MobilePlatform.instance = new MobilePlatform();
    }
    return MobilePlatform.instance;
  }

  // Platform detection
  public get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public get isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  public get isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  public get isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  // Plugin availability
  public isPluginAvailable(pluginName: string): boolean {
    return Capacitor.isPluginAvailable(pluginName);
  }

  // File Picker (Nativo)
  public async pickIFCFile(): Promise<File | null> {
    if (!this.isNative) {
      console.warn('File picker only works on native platforms');
      return null;
    }

    try {
      const { FilePicker } = await import('@capawesome/capacitor-file-picker');
      
      const result = await FilePicker.pickFiles({
        types: ['public.data'],
        multiple: false,
        readData: true
      });

      if (result.files.length === 0) {
        return null;
      }

      const file = result.files[0];
      const blob = file.blob || new Blob([file.data!], { type: file.mimeType });
      return new File([blob], file.name, { type: file.mimeType });

    } catch (error) {
      console.error('❌ File picker failed:', error);
      return null;
    }
  }

  // Camera/AR
  public async capturePhoto(options?: { quality?: number }): Promise<string | null> {
    if (!this.isPluginAvailable('Camera')) {
      console.warn('Camera plugin not available');
      return null;
    }

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const image = await Camera.getPhoto({
        quality: options?.quality ?? 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      return image.webPath ?? null;

    } catch (error) {
      if ((error as any).message?.includes('cancel')) {
        return null; // User cancelled
      }
      console.error('❌ Camera capture failed:', error);
      return null;
    }
  }

  // GPS/Location
  public async getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
    if (!this.isPluginAvailable('Geolocation')) {
      console.warn('Geolocation plugin not available');
      return null;
    }

    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

    } catch (error) {
      console.error('❌ Geolocation failed:', error);
      return null;
    }
  }

  // File Storage
  public async saveFile(path: string, data: string): Promise<boolean> {
    if (!this.isPluginAvailable('Filesystem')) {
      console.warn('Filesystem plugin not available');
      return false;
    }

    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      
      await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Documents,
        recursive: true
      });

      console.log('✅ File saved:', path);
      return true;

    } catch (error) {
      console.error('❌ Save file failed:', error);
      return false;
    }
  }

  public async readFile(path: string): Promise<string | null> {
    if (!this.isPluginAvailable('Filesystem')) {
      return null;
    }

    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Documents
      });

      return result.data as string;

    } catch (error) {
      console.error('❌ Read file failed:', error);
      return null;
    }
  }

  public async deleteFile(path: string): Promise<boolean> {
    if (!this.isPluginAvailable('Filesystem')) {
      return false;
    }

    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      
      await Filesystem.deleteFile({
        path,
        directory: Directory.Documents
      });

      return true;

    } catch (error) {
      console.error('❌ Delete file failed:', error);
      return false;
    }
  }

  // Share
  public async shareContent(options: { title: string; text?: string; url?: string; files?: string[] }): Promise<boolean> {
    if (!this.isPluginAvailable('Share')) {
      console.warn('Share plugin not available');
      return false;
    }

    try {
      const { Share } = await import('@capacitor/share');
      
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        files: options.files,
        dialogTitle: options.title
      });

      return true;

    } catch (error) {
      console.error('❌ Share failed:', error);
      return false;
    }
  }

  // App Lifecycle
  public onAppStateChange(callback: (isActive: boolean) => void): void {
    if (!this.isPluginAvailable('App')) {
      return;
    }

    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        callback(isActive);
      });
    });
  }

  public onBackButton(callback: () => boolean): void {
    if (!this.isAndroid) {
      return;
    }

    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        const shouldClose = callback();
        if (shouldClose) {
          App.exitApp();
        }
      });
    });
  }

  // Motion/Sensors
  public onMotion(callback: (data: { x: number; y: number; z: number }) => void): void {
    if (!this.isPluginAvailable('Motion')) {
      return;
    }

    import('@capacitor/motion').then(({ Motion }) => {
      Motion.addListener('accel', (event) => {
        callback(event.acceleration);
      });
    });
  }

  // Haptics
  public async vibrate(type: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (!this.isPluginAvailable('Haptics')) {
      return;
    }

    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      };

      await Haptics.impact({ style: styleMap[type] });

    } catch (error) {
      console.error('❌ Haptics failed:', error);
    }
  }

  // StatusBar
  public async setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
    if (!this.isPluginAvailable('StatusBar')) {
      return;
    }

    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      await StatusBar.setStyle({
        style: style === 'light' ? Style.Light : Style.Dark
      });

    } catch (error) {
      console.error('❌ StatusBar style failed:', error);
    }
  }

  // Keyboard
  public async hideKeyboard(): Promise<void> {
    if (!this.isPluginAvailable('Keyboard')) {
      return;
    }

    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      await Keyboard.hide();
    } catch (error) {
      console.error('❌ Hide keyboard failed:', error);
    }
  }
}

// Export singleton instance
export const mobilePlatform = MobilePlatform.getInstance();

// Export compatibility layer for AR system
export const NativeBridge = {
  isNative: () => mobilePlatform.isNative,
  isAndroid: () => mobilePlatform.isAndroid,
  isIOS: () => mobilePlatform.isIOS,
  isWeb: () => mobilePlatform.isWeb,
  isPluginAvailable: (pluginName: string) => mobilePlatform.isPluginAvailable(pluginName)
};
