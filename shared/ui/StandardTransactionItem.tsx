import React, { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import type { Transaction, User } from '@/shared/types';
import { format, parseISO, formatCurrency } from '@/shared/utils/dateUtils';
import { iconMap, FlaskConical, Link, getIconComponent } from '@/shared/ui';
import { TagPill } from '@/shared/ui';

export interface StandardTransactionItemProps {
    transaction: Transaction;
    onClick: (transaction: Transaction) => void;
    density?: 'normal' | 'compact';
    showSublineInList?: 'category' | 'date';
}

const StandardTransactionItem: FC<StandardTransactionItemProps> = ({
    transaction,
    onClick,
    density = 'compact',
    showSublineInList = 'category',
}) => {
    const { categoryMap, tagMap, users } = useApp();

    const category = useMemo(() => categoryMap.get(transaction.categoryId), [transaction.categoryId, categoryMap]);
    const createdBy = useMemo(() => transaction.createdBy ? users.find(u => u.id === transaction.createdBy) : null, [transaction.createdBy, users]);

    if (!category) return null; // Or return a fallback UI

    const Icon = getIconComponent(transaction.iconOverride || category.icon);
    const color = category.color;
    const isCompact = density === 'compact';
    const isDemo = transaction.isDemo;
    const isGrouped = !!transaction.transactionGroupId;

    const userAvatar = createdBy ? (
        <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: createdBy.color }}
            title={`Erstellt von: ${createdBy.name}`}
        >
            {createdBy.name.charAt(0).toUpperCase()}
        </div>
    ) : null;
    
    const sublineText = showSublineInList === 'category'
        ? category.name
        : transaction.date ? `${format(parseISO(transaction.date), 'dd.MM, HH:mm')} Uhr` : '';

    const listLayout = (
        <motion.button
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
                    {isGrouped && (
                         <span title="Teil einer Transaktionsgruppe">
                             <Link className="h-3 w-3 text-slate-500" />
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
    
    return listLayout;
};

export default StandardTransactionItem;