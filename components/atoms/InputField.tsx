// ATOM: InputField
// Komponen input standar dengan label, ikon, dan toggle password.
'use client';

import React, { useState, InputHTMLAttributes } from 'react';
import { cn } from '@/libs/utils';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: string;
  accentColor?: string;
  isPassword?: boolean;
  className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  icon,
  accentColor = '#006591',
  isPassword = false,
  className,
  ...inputProps
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className={cn('w-full', className)}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-[#a0b4bf] block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b8cad4] text-[18px] pointer-events-none">
          {icon}
        </span>
        <input
          {...inputProps}
          type={isPassword ? (show ? 'text' : 'password') : inputProps.type}
          className="w-full pl-10 pr-12 py-3 rounded-xl text-[#083b54] placeholder-[#c8d8df] text-sm outline-none transition-all"
          style={{
            background: '#f7fbfd',
            border: '1.5px solid #d4e5ed',
            ...inputProps.style,
          }}
          onFocus={e => {
            e.target.style.border = `1.5px solid ${accentColor}`;
            e.target.style.background = '#fff';
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            e.target.style.border = '1.5px solid #d4e5ed';
            e.target.style.background = '#f7fbfd';
            inputProps.onBlur?.(e);
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b8cad4] hover:text-[#006591] transition-colors"
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {show ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
