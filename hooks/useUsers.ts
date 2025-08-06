import { useReducer, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { User } from '../types';

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
            return { ...state, users: action.payload.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)) };
        case 'ADD_USER':
            return { ...state, users: [...state.users, action.payload].sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)) };
        case 'UPDATE_USER':
            return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u).sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)) };
        default:
            return state;
    }
};

const emptyState: UsersState = { users: [] };

export const useUsers = () => {
    const [state, dispatch] = useReducer(usersReducer, emptyState);

    const setUsers = useCallback((users: User[]) => {
        dispatch({ type: 'SET_USERS', payload: users });
    }, []);

    const users = useMemo(() => state.users.filter(u => !u.isDeleted), [state.users]);
    
    // Effect to create default user if sheet is empty
    useEffect(() => {
        // After initial load from sync, if there are NO users at all (not even deleted ones),
        // it implies a fresh sheet. Let's create the default user.
        if (state.users.length === 0) {
            const defaultUser: User = {
                id: '1001',
                name: 'Benutzer',
                color: '#64748b',
                lastModified: new Date().toISOString(),
                version: 1
            };
            dispatch({ type: 'ADD_USER', payload: defaultUser });
        }
    }, [state.users.length]); // Depend on length to only run when it changes from 0 or to 0.

    const getNextId = useCallback(() => {
        if (state.users.length === 0) {
            return '1001';
        }
        const maxId = Math.max(1000, ...state.users.map(u => {
            const parsedId = parseInt(u.id, 10);
            return isNaN(parsedId) ? 0 : parsedId;
        }));
        return (maxId + 1).toString();
    }, [state.users]);
    
    const addUser = useCallback((name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Benutzername darf nicht leer sein.");
            return;
        }
        const now = new Date().toISOString();
        const newUser: User = {
            id: getNextId(),
            name: trimmedName,
            color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            lastModified: now,
            version: 1
        };
        dispatch({ type: 'ADD_USER', payload: newUser });
        toast.success(`Benutzer "${trimmedName}" hinzugefügt.`);
    }, [getNextId]);

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

    const deleteUser = useCallback((id: string) => {
        const userToDelete = state.users.find(u => u.id === id);
        if (userToDelete) {
             if (users.length <= 1) {
                toast.error("Der letzte Benutzer kann nicht gelöscht werden.");
                return;
            }
            const updatedUser: User = {
                ...userToDelete,
                isDeleted: true,
                lastModified: new Date().toISOString(),
                version: (userToDelete.version || 0) + 1,
            };
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });
            toast.success(`Benutzer "${userToDelete.name}" gelöscht.`);
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
