import React from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalItems === 0) return null;

    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: 'white',
            borderTop: '1px solid #E0E6ED',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
        }}>
            <div style={{ fontSize: '0.85rem', color: '#718096', fontWeight: 500 }}>
                Showing <span style={{ color: '#2D3748', fontWeight: 600 }}>{startIndex}</span> to <span style={{ color: '#2D3748', fontWeight: 600 }}>{endIndex}</span> of <span style={{ color: '#2D3748', fontWeight: 600 }}>{totalItems}</span> entries
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(1)}
                    className="ae-pagination-btn"
                    style={{
                        opacity: currentPage === 1 ? 0.5 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: '1px solid #E0E6ED',
                        background: 'white',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (currentPage !== 1) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                    }}
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="ae-pagination-btn"
                    style={{
                        opacity: currentPage === 1 ? 0.5 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: '1px solid #E0E6ED',
                        background: 'white',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (currentPage !== 1) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                    }}
                >
                    <ChevronLeft size={16} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#718096', margin: '0 8px' }}>
                        Page <span style={{ color: '#2D3748', fontWeight: 600 }}>{currentPage}</span> of {totalPages}
                    </span>
                </div>

                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="ae-pagination-btn"
                    style={{
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: '1px solid #E0E6ED',
                        background: 'white',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (currentPage !== totalPages) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                    }}
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(totalPages)}
                    className="ae-pagination-btn"
                    style={{
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: '1px solid #E0E6ED',
                        background: 'white',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (currentPage !== totalPages) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                    }}
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
