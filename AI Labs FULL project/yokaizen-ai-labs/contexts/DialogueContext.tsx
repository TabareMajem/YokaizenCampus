import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type CharacterType = 'ATHENA' | 'BYTE' | 'SYNTAX' | 'SYSTEM' | 'UNKNOWN';

export interface DialogueLine {
    id: string;
    character: CharacterType;
    text: string;
    portraitUrl?: string;
    isGlitchy?: boolean;
}

interface DialogueContextType {
    isActive: boolean;
    currentLine: DialogueLine | null;
    queueDialogue: (lines: DialogueLine[]) => void;
    nextLine: () => void;
    clearDialogue: () => void;
}

const DialogueContext = createContext<DialogueContextType | undefined>(undefined);

export const DialogueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<DialogueLine[]>([]);
    const [isActive, setIsActive] = useState(false);

    const queueDialogue = useCallback((lines: DialogueLine[]) => {
        setQueue(lines);
        if (lines.length > 0) {
            setIsActive(true);
        }
    }, []);

    const nextLine = useCallback(() => {
        setQueue((prevQueue) => {
            const newQueue = prevQueue.slice(1);
            if (newQueue.length === 0) {
                setIsActive(false);
            }
            return newQueue;
        });
    }, []);

    const clearDialogue = useCallback(() => {
        setQueue([]);
        setIsActive(false);
    }, []);

    return (
        <DialogueContext.Provider value={{
            isActive,
            currentLine: queue.length > 0 ? queue[0] : null,
            queueDialogue,
            nextLine,
            clearDialogue
        }}>
            {children}
        </DialogueContext.Provider>
    );
};

export const useDialogue = () => {
    const context = useContext(DialogueContext);
    if (context === undefined) {
        throw new Error('useDialogue must be used within a DialogueProvider');
    }
    return context;
};
