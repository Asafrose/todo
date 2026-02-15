import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline";
}

export function Button({
  className = "",
  variant = "default",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors";

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400",
    destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400",
    outline:
      "border border-gray-300 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
