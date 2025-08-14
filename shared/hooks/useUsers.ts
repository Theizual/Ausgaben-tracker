import { useReducer, useMemo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { User } from '@/shared/types';
import { generateUUID } from '../utils/uuid';
import { apiGet } from '../lib/http';

type UsersState = {
    users: User[];
};

type Action =
    | { type: 'SET_USERS'; payload: User[] }
    | { type: 'ADD_USER'; payload: User }
    | { type: 'UPDATE_USER'; payload: User };

const usersReducer = (state: UsersState, action: Action): UsersState => {
    switch (action.type) {
        case 'SET_USERS':
            return { ...state, users: action.payload.sort((a, b) => a.id.localeCompare(b.id)) };
        case 'ADD_USER':
            return { ...state, users: [...state.users, action.payload].sort((a, b) => a.id.localeCompare(b.id)) };
        case 'UPDATE_USER':
            return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u).sort((a, b) => a.id.localeCompare(b.id)) };
        default:
            return state;
    }
};

const makeInitializer = (): (() => UsersState) => () => {
    // Initializer is now simple. The useEffect handles loading from storage or API.
    return { users: [] };
};

export const useUsers = ({ isDemoModeEnabled }: { isDemoModeEnabled: boolean }) => {
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const USERS_KEY = `${prefix}users`;

    const [state, dispatch] = useReducer(usersReducer, undefined, makeInitializer());
    const [isLoading, setIsLoading] = useState(true);

    // Effect for initializing and persisting users
    useEffect(() => {
        if (!isLoading) { // Only persist after initial load is done
            window.localStorage.setItem(USERS_KEY, JSON.stringify(state.users));
        }
    }, [state.users, USERS_KEY, isLoading]);

    // Effect for initial loading
    useEffect(() => {
        const initialSetupDone = JSON.parse(window.localStorage.getItem('initialSetupDone') || 'false');
        
        let storedUsers: User[] = [];
        try {
            const storedUsersStr = window.localStorage.getItem(USERS_KEY);
            if (storedUsersStr) storedUsers = JSON.parse(storedUsersStr);
        } catch {}

        if (storedUsers.length > 0) {
            dispatch({ type: 'SET_USERS', payload: storedUsers });
            setIsLoading(false);
        } else if (!isDemoModeEnabled && initialSetupDone) {
            // Standard mode, after setup, no users -> fetch from server
            apiGet('/api/sheets/read?ranges=Users!A2:Z')
                .then(({ users }) => {
                    dispatch({ type: 'SET_USERS', payload: users || [] });
                })
                .catch(err => {
                    toast.error("Benutzer konnten nicht geladen werden.");
                    dispatch({ type: 'SET_USERS', payload: [] });
                })
                .finally(() => setIsLoading(false));
        } else {
            // Demo mode, or fresh standard install before setup is done, start with no users.
            dispatch({ type: 'SET_USERS', payload: [] });
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDemoModeEnabled]); // Re-run only on mode change

    const setUsers = useCallback((users: User[]) => {
        dispatch({ type: 'SET_USERS', payload: users });
    }, []);

    const users = useMemo(() => {
        return state.users.filter(user => {
            if (user.isDeleted) {
                return false;
            }
            // Im Live-Modus (nicht Demo-Modus) sollen Demo-Benutzer nie angezeigt werden.
            if (!isDemoModeEnabled && user.isDemo) {
                return false;
            }
            return true;
        });
    }, [state.users, isDemoModeEnabled]);
    
    const addUser = useCallback((name: string, color?: string): User => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            const err = "Benutzername darf nicht leer sein.";
            toast.error(err);
            throw new Error(err);
        }
        const now = new Date().toISOString();
        const newUser: User = {
            id: generateUUID('usr'),
            name: trimmedName,
            color: color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            lastModified: now,
            version: 1,
            isDemo: false,
        };
        dispatch({ type: 'ADD_USER', payload: newUser });
        toast.success(`Benutzer "${trimmedName}" hinzugefügt.`);
        return newUser;
    }, []);

    const updateUser = useCallback((id: string, updates: Partial<Omit<User, 'id' | 'version' | 'lastModified'>>) => {
        const userToUpdate = state.users.find(u => u.id === id);
        if (userToUpdate) {
            const updatedUser: User = {
                ...userToUpdate,
                ...updates,
                lastModified: new Date().toISOString(),
                version: (userToUpdate.version || 0) + 1
            };
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        }
    }, [state.users]);

    const deleteUser = useCallback((id: string, options?: { silent?: boolean }) => {
        const userToDelete = state.users.find(u => u.id === id);
        if (userToDelete) {
            // Prevent deleting the last non-demo user. Demo user can always be deleted.
            const nonDemoUsers = users.filter(u => !u.isDemo);
            if (nonDemoUsers.length <= 1 && !userToDelete.isDemo) {
                if (!options?.silent) {
                    toast.error("Der letzte Benutzer kann nicht gelöscht werden.");
                }
                return;
            }

            const updatedUser: User = {
                ...userToDelete,
                isDeleted: true,
                lastModified: new Date().toISOString(),
                version: (userToDelete.version || 0) + 1,
            };
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });
            if (!options?.silent) {
                toast.success(`Benutzer "${userToDelete.name}" gelöscht.`);
            }
        }
    }, [state.users, users]);
    
    return {
        users, // live
        rawUsers: state.users, // for sync
        isLoading,
        setUsers, // for sync
        addUser,
        updateUser,
        deleteUser
    };
};
