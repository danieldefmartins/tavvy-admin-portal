/**
 * Keyboard Shortcuts Management
 * Provides consistent keyboard shortcuts across the admin portal
 */

export type ShortcutHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
}

class KeyboardShortcutManager {
  private shortcuts: Shortcut[] = [];
  private isListening = false;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: Shortcut): () => void {
    this.shortcuts.push(shortcut);
    
    if (!this.isListening) {
      this.startListening();
    }
    
    // Return unregister function
    return () => {
      const index = this.shortcuts.indexOf(shortcut);
      if (index > -1) {
        this.shortcuts.splice(index, 1);
      }
    };
  }

  /**
   * Start listening for keyboard events
   */
  private startListening(): void {
    if (this.isListening) return;
    
    document.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  /**
   * Stop listening for keyboard events
   */
  stopListening(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // Don't trigger shortcuts when typing in input fields (except for special keys)
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;
    
    // Allow Escape and Ctrl+K even in input fields
    const isSpecialKey = event.key === 'Escape' || 
                        (event.key === 'k' && (event.ctrlKey || event.metaKey));
    
    if (isInput && !isSpecialKey) return;

    // Find matching shortcut
    for (const shortcut of this.shortcuts) {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !shortcut.ctrl || event.ctrlKey;
      const metaMatches = !shortcut.meta || event.metaKey;
      const shiftMatches = !shortcut.shift || event.shiftKey;
      const altMatches = !shortcut.alt || event.altKey;

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }
  };

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Shortcut[] {
    return [...this.shortcuts];
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: Shortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.meta) parts.push('⌘');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join('+');
  }
}

// Singleton instance
export const keyboardShortcuts = new KeyboardShortcutManager();

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
  options: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    description?: string;
  } = {}
): void {
  // This will be used in React components
  // Implementation will use useEffect to register/unregister
}
