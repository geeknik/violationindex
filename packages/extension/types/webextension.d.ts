/**
 * Minimal type declarations for Firefox WebExtension APIs (browser.*).
 * Covers only the APIs used by this extension.
 */

declare namespace browser {
  namespace webNavigation {
    interface NavigationDetails {
      tabId: number;
      url: string;
      frameId: number;
      timeStamp: number;
    }
    const onBeforeNavigate: {
      addListener(callback: (details: NavigationDetails) => void): void;
    };
  }

  namespace webRequest {
    interface RequestDetails {
      requestId: string;
      url: string;
      method: string;
      tabId: number;
      type: string;
      timeStamp: number;
      frameId: number;
    }
    interface RequestFilter {
      urls: string[];
      types?: string[];
    }
    const onBeforeRequest: {
      addListener(
        callback: (details: RequestDetails) => void,
        filter: RequestFilter,
      ): void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
      active: boolean;
    }
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function create(createProperties: { url: string }): Promise<Tab>;
    const onRemoved: {
      addListener(callback: (tabId: number) => void): void;
    };
  }

  namespace runtime {
    interface MessageSender {
      tab?: browser.tabs.Tab;
      frameId?: number;
      id?: string;
    }
    function sendMessage(message: unknown): Promise<unknown>;
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void | Promise<unknown>,
      ): void;
    };
  }

  namespace storage {
    interface StorageArea {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    }
    const local: StorageArea;
  }
}
