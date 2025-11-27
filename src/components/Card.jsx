import React from 'react';
import { X, MoreHorizontal, Folder, ExternalLink } from 'lucide-react';

const Card = ({ 
  item, 
  style, 
  className, 
  onMouseDown, 
  onMouseUp, 
  onTouchEnd, 
  children,
  isEditMode,
  onDelete,
  onEditTitle,
  ...props 
}) => {
  return (
    <div
      style={style}
      className={`
        bg-glass backdrop-blur-md border border-glassBorder rounded-xl 
        flex flex-col overflow-hidden select-none
        ${className}
      `}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      {/* هدر کارت */}
      <div className="flex items-center justify-between p-2 border-b border-glassBorder bg-white/5 cursor-grab active:cursor-grabbing">
        <input 
          type="text" 
          value={item.title}
          disabled={!isEditMode}
          onChange={(e) => onEditTitle(item.i, e.target.value)}
          className="bg-transparent border-none outline-none text-white text-sm font-bold w-full px-1"
          placeholder="عنوان کارت"
        />
        
        {isEditMode && (
          <button 
            onClick={() => onDelete(item.i)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* محتوای کارت */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

export default Card;
