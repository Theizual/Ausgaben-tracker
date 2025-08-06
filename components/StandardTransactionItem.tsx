import React, { FC, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Transaction } from '../types';
import { format, parseISO, formatCurrency } from '../utils/dateUtils';
import { iconMap, Edit, Trash2 } from './Icons';

interface StandardTransactionItemProps {
    transaction: Transaction;
    onClick: (transaction: Transaction) => void;
    onDelete?: (transaction: Transaction) => void;
    showSubline?: 'category' | 'date';
}

const StandardTransactionItem: FC<StandardTransactionItemProps> = ({ 
    transaction, 
    onClick,
    onDelete,
    showSubline = 'date'
}) => {
    const { categoryMap, tagMap, users } = useApp();
    
    const category = categoryMap.get(transaction.categoryId);
    const createdBy = useMemo(() => transaction.createdBy ? users.find(u => u.id === transaction.createdBy) : null, [transaction.createdBy, users]);

    if (!category) return null;

    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
    const color = category.color;

    const userAvatar = createdBy ? (
        <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: createdBy.color }}
            title={`Erstellt von: ${createdBy.name}`}
        >
            {createdBy.name.charAt(0).toUpperCase()}
        </div>
    ) : null;
    
    const sublineText = showSubline === 'category' 
        ? category.name 
        : `${format(parseISO(transaction.date), 'dd.MM, HH:mm')} Uhr`;

    return (
        <div className="group flex items-center rounded-lg hover:bg-slate-700/50 transition-colors duration-150 gap-1 px-1 py-0.5">
            <button
                onClick={() => onClick(transaction)}
                className="w-full flex items-center flex-1 min-w-0 text-left cursor-pointer gap-2 py-1"
                aria-label={`Transaktion ansehen: ${transaction.description}, ${formatCurrency(transaction.amount)}`}
            >
                <div className="rounded-full flex items-center justify-center flex-shrink-0 w-8 h-8" style={{ backgroundColor: color }}>
                    <Icon className="text-white h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">{transaction.description}</p>
                    <p className="text-xs text-slate-400 truncate">{sublineText}</p>
                </div>

                <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 ml-auto pl-2">
                    {transaction.tagIds?.slice(0, 2).map(id => {
                        const tagName = tagMap.get(id);
                        if (!tagName) return null;
                        return (
                            <span key={id} className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                #{tagName}
                            </span>
                        );
                    })}
                </div>
                 <div className="ml-2 flex-shrink-0">
                    {userAvatar}
                </div>
                <p className="font-bold text-white text-right w-24 flex-shrink-0 ml-2 text-base">{formatCurrency(transaction.amount)}</p>
            </button>
            <div className="flex items-center gap-0 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => onClick(transaction)}
                    className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white"
                    title="Bearbeiten"
                    aria-label={`Bearbeiten: ${transaction.description}`}
                >
                    <Edit className="h-4 w-4" />
                </button>
                {onDelete && (
                     <button
                        onClick={() => onDelete(transaction)}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-red-400"
                        title="Löschen"
                        aria-label={`Löschen: ${transaction.description}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default StandardTransactionItem;