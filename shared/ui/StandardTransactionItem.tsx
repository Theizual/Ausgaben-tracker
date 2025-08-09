
import React, { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, User, TransactionViewMode } from '@/shared/types';
import { format, parseISO, formatCurrency } from '@/shared/utils/dateUtils';
import { iconMap, FlaskConical } from '@/shared/ui';
import { TagPill } from '@/shared/ui';

export interface StandardTransactionItemProps {
    transaction: Transaction;
    onClick: (transaction: Transaction) => void;
    viewMode?: TransactionViewMode;
    density?: 'normal' | 'compact';
    showSublineInList?: 'category' | 'date';
}

const StandardTransactionItem: FC<StandardTransactionItemProps> = ({
    transaction,
    onClick,
    viewMode = 'list',
    density = 'compact',
    showSublineInList = 'category',
}) => {
    const { categoryMap, tagMap, users } = useApp();

    const category = useMemo(() => categoryMap.get(transaction.categoryId), [transaction.categoryId, categoryMap]);
    const createdBy = useMemo(() => transaction.createdBy ? users.find(u => u.id === transaction.createdBy) : null, [transaction.createdBy, users]);

    if (!category) return null; // Or return a fallback UI

    const Icon = iconMap[category.icon] || iconMap.MoreHorizontal;
    const color = category.color;
    const isCompact = density === 'compact';
    const isDemo = transaction.isDemo;

    const userAvatar = createdBy ? (
        <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: createdBy.color }}
            title={`Erstellt von: ${createdBy.name}`}
        >
            {createdBy.name.charAt(0).toUpperCase()}
        </div>
    ) : null;

    const cardLayout = (
        <motion.button
            layout
            onClick={() => onClick(transaction)}
            className={`relative flex gap-3 transition-all duration-200 h-full w-full rounded-xl bg-slate-800 hover:bg-slate-700/50 text-left ${isCompact ? 'p-3' : 'p-4'}`}
        >
            {/* Column 1: Icon, Demo, User */}
            <div className={`flex flex-col items-center justify-between flex-shrink-0 ${isCompact ? 'w-9 py-0.5' : 'w-10 py-1'}`}>
                <div
                    className={`rounded-full flex items-center justify-center flex-shrink-0 ${isCompact ? 'w-9 h-9' : 'w-10 h-10'}`}
                    style={{ backgroundColor: color }}
                    title={category?.name}
                >
                    <Icon className={`text-white ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </div>
                
                <div className="flex flex-col items-center gap-1.5">
                    {isDemo && (
                        <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" title="Demo Eintrag">
                            <FlaskConical className="h-3 w-3" />
                            DEMO
                        </span>
                    )}
                    {userAvatar}
                </div>
            </div>
    
            {/* Column 2: Details */}
            <div className="flex flex-col flex-grow min-w-0">
                <p className={`font-semibold text-white truncate ${isCompact ? 'text-base' : 'text-lg'}`}>{transaction.description}</p>
                <p className={`text-slate-400 truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>{category?.name}</p>
                
                {transaction.tagIds && transaction.tagIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-2">
                        {transaction.tagIds.slice(0, 3).map(id => {
                            const tagName = tagMap.get(id);
                            if (!tagName) return null;
                            return (
                                <TagPill
                                    key={id}
                                    tagName={tagName}
                                    size="sm"
                                />
                            );
                        })}
                    </div>
                )}
            </div>
    
            {/* Column 3: Amount */}
            <div className="flex flex-col items-end justify-start flex-shrink-0">
                <p className={`font-bold text-white text-right ${isCompact ? 'text-lg' : 'text-xl'}`}>{formatCurrency(transaction.amount)}</p>
            </div>
        </motion.button>
    );
    
    const sublineText = showSublineInList === 'category'
        ? category.name
        : transaction.date ? `${format(parseISO(transaction.date), 'dd.MM, HH:mm')} Uhr` : '...';

    const listLayout = (
        <motion.button
            layout
            onClick={() => onClick(transaction)}
            className={`w-full flex items-center rounded-lg transition-colors duration-150 hover:bg-slate-700/50 text-left ${isCompact ? 'gap-2 px-2 py-1' : 'gap-3 p-2'}`}
        >
            {/* Icon */}
            <div className={`rounded-full flex items-center justify-center flex-shrink-0 ${isCompact ? 'w-8 h-8' : 'w-10 h-10'}`} style={{ backgroundColor: color }}>
                <Icon className={`text-white ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </div>

            {/* Description, Category, Tags */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {isDemo && (
                        <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" title="Demo Eintrag">
                             <FlaskConical className="h-3 w-3" />
                             DEMO
                        </span>
                    )}
                    <p className={`font-semibold text-white truncate ${isCompact ? 'text-sm' : ''}`}>{transaction.description}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate">{sublineText}</p>
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                        {transaction.tagIds?.slice(0, 2).map(id => {
                            const tagName = tagMap.get(id);
                            if (!tagName) return null;
                            return (
                                <TagPill
                                    key={id}
                                    tagName={tagName}
                                    size="sm"
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Amount */}
            <p className={`font-bold text-white text-right w-24 flex-shrink-0 ml-4 ${isCompact ? 'text-base' : 'text-md'}`}>{formatCurrency(transaction.amount)}</p>

            {/* User Avatar */}
            <div className="ml-2 flex-shrink-0 w-6 flex items-center justify-center">
                {userAvatar}
            </div>
        </motion.button>
    );
    
    return viewMode === 'grid' ? cardLayout : listLayout;
};

export default StandardTransactionItem;
