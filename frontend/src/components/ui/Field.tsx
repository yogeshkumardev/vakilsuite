import {
    forwardRef,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";

export const CONTROL_CLASS = "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 read-only:bg-slate-50";

interface FieldProps {
    label: ReactNode;
    htmlFor?: string;
    error?: ReactNode;
    hint?: ReactNode;
    required?: boolean;
    children: ReactNode;
    className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className = "" }: FieldProps) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium leading-5 text-slate-700">
                {label}
                {required ? <span className="ml-0.5 text-red-600" aria-hidden="true">*</span> : null}
            </label>
            {children}
            {error ? <p className="mt-1 text-xs leading-4 text-red-600">{error}</p> : null}
            {!error && hint ? <p className="mt-1 text-xs leading-4 text-slate-500">{hint}</p> : null}
        </div>
    );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
    { className = "", ...props },
    ref,
) {
    return <input ref={ref} className={`${CONTROL_CLASS} h-10 ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
    { className = "", ...props },
    ref,
) {
    return <select ref={ref} className={`${CONTROL_CLASS} h-10 cursor-pointer ${className}`} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
    { className = "", ...props },
    ref,
) {
    return <textarea ref={ref} className={`${CONTROL_CLASS} min-h-24 resize-y py-2.5 ${className}`} {...props} />;
});
