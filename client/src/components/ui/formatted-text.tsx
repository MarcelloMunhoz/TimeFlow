import * as React from "react";
import { cn } from "@/lib/utils";

interface FormattedTextProps {
  children: string | null | undefined;
  className?: string;
  maxLines?: number;
  showExpand?: boolean;
  variant?: "default" | "muted" | "small" | "large";
  preserveWhitespace?: boolean;
}

export function FormattedText({
  children,
  className,
  maxLines,
  showExpand = false,
  variant = "default",
  preserveWhitespace = true,
}: FormattedTextProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [shouldShowExpand, setShouldShowExpand] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);

  // Check if text should be truncated
  React.useEffect(() => {
    if (maxLines && textRef.current && !isExpanded) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      setShouldShowExpand(textRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxLines, isExpanded]);

  if (!children || children.trim() === "") {
    return null;
  }

  // Process text to handle line breaks and formatting
  const processText = (text: string) => {
    if (!preserveWhitespace) {
      return text;
    }

    // Split by line breaks and create paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      // Handle single line breaks within paragraphs
      const lines = paragraph.split('\n').map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line}
        </React.Fragment>
      ));

      return (
        <p key={index} className={cn(
          "mb-3 last:mb-0",
          variant === "small" && "text-sm",
          variant === "large" && "text-lg",
          variant === "muted" && "text-muted-foreground"
        )}>
          {lines}
        </p>
      );
    });
  };

  const baseClasses = cn(
    "leading-relaxed",
    variant === "default" && "text-foreground",
    variant === "muted" && "text-muted-foreground",
    variant === "small" && "text-sm text-muted-foreground",
    variant === "large" && "text-lg text-foreground",
    className
  );

  const truncateClasses = maxLines && !isExpanded ? {
    display: '-webkit-box',
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  } : {};

  return (
    <div className="space-y-0">
      <div
        ref={textRef}
        className={baseClasses}
        style={truncateClasses}
      >
        {processText(children)}
      </div>
      
      {showExpand && shouldShowExpand && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
        >
          {isExpanded ? "Mostrar menos" : "Mostrar mais"}
        </button>
      )}
    </div>
  );
}

// Specialized variants for common use cases
export function DescriptionText({ children, className, ...props }: Omit<FormattedTextProps, 'variant'>) {
  return (
    <FormattedText
      variant="muted"
      className={cn("text-sm", className)}
      {...props}
    >
      {children}
    </FormattedText>
  );
}

export function CardDescriptionText({ children, className, maxLines = 3, ...props }: Omit<FormattedTextProps, 'variant'>) {
  return (
    <FormattedText
      variant="muted"
      className={cn("text-sm", className)}
      maxLines={maxLines}
      showExpand={true}
      {...props}
    >
      {children}
    </FormattedText>
  );
}

export function DetailText({ children, className, ...props }: Omit<FormattedTextProps, 'variant'>) {
  return (
    <FormattedText
      variant="default"
      className={cn("text-base", className)}
      {...props}
    >
      {children}
    </FormattedText>
  );
}
