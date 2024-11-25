import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { Button, HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { backupDatabase, restoreDatabase } from '~/new/backup-restore';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames(
        'flex items-center bg-bolt-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        },
      )}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          <span className="i-bolt:logo-text?mask w-[46px] inline-block" />
        </a>
      </div>
      <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
      </span>
      {chat.started ? (
        <ClientOnly>
          {() => (
            <div className="mr-1">
              <div className="flex">
                <div className="flex mr-1">
                  <Button
                    onClick={() => {
                      backupDatabase();
                    }}
                  >
                    <div className="i-ph:download" style={{
                      marginRight: '5px'
                    }} />
                    Backup
                  </Button>
                  <Button
                    onClick={() => {
                      restoreDatabase();
                    }}
                  >
                    <div className="i-ph:database" style={{
                      marginRight: '5px'
                    }} />
                    Restore
                  </Button>
                </div>
                <HeaderActionButtons />
              </div>
            </div>
          )}
        </ClientOnly>
      ) : (
        <ClientOnly>
          {() => (
            <div className="mr-1">
              <div className="flex">
                  <Button
                    onClick={() => {
                      backupDatabase();
                    }}
                  >
                    <div className="i-ph:download" style={{
                      marginRight: '5px'
                    }} />
                    Backup
                  </Button>
                  <Button
                    onClick={() => {
                      restoreDatabase();
                    }}
                  >
                    <div className="i-ph:database" style={{
                      marginRight: '5px'
                    }} />
                    Restore
                  </Button>
              </div>
            </div>
          )}
      </ClientOnly>
      )}
    </header>
  );
}
