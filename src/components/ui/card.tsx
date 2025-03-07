import React from "react";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <h3
      className={`text-xl font-bold ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <p
      className={`text-sm text-gray-500 mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`p-6 pt-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};