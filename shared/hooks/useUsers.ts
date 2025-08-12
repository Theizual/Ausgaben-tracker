import { useReducer, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { User } from '@/shared/types';
import { generateUUID } from '../utils/uuid';

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

const makeInitializer = (isDemoMode: boolean): (() => UsersState) => () => {
    const prefix = isDemoMode ? 'demo_' : '';
    const USERS_KEY = `${prefix}users`;

    try {
        const storedUsers = JSON.parse(window.localStorage.getItem(USERS_KEY) || '[]');
        if (Array.isArray(storedUsers) && storedUsers.length > 0) {
            return { users: storedUsers };
        }
    } catch (error) {
        // Failed to parse users from localStorage, will start fresh.
    }
    
    // If localStorage is empty or corrupt, create the default user.
    const defaultUser: User = {
        id: 'usr_demo',
        name: 'Demo-Modus',
        color: '#8b5cf6', // violet-500
        isDemo: true,
        lastModified: new Date().toISOString(),
        version: 1
    };
    return { users: [defaultUser] };
};

export const useUsers = ({ isDemoModeEnabled }: { isDemoModeEnabled: boolean }) => {
    const prefix = isDemoModeEnabled ? 'demo_' : '';
    const USERS_KEY = `${prefix}users`;

    const initializer = useMemo(() => makeInitializer(isDemoModeEnabled), [isDemoModeEnabled]);
    const [state, dispatch] = useReducer(usersReducer, undefined, initializer);

    // Persist to localStorage on change
    useEffect(() => {
        window.localStorage.setItem(USERS_KEY, JSON.stringify(state.users));
    }, [state.users, USERS_KEY]);

    const setUsers = useCallback((users: User[]) => {
        dispatch({ type: 'SET_USERS', payload: users });
    }, []);

    const users = useMemo(() => state.users.filter(u => !u.isDeleted), [state.users]);
    
    const addUser = useCallback((name: string): User => {
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
            color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
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
        setUsers, // for sync
        addUser,
        updateUser,
        deleteUser
    };
};