import React from "react";

export interface CustomButtonProps {
  icon?: string | React.ComponentType<any> | React.ReactNode;
  variant?: "default" | "outline";
  iconBgTransparent?: boolean;
  /**
   * When true, the button's children (label text) are hidden on small screens
   * (< sm) and only the icon remains. Useful for compact icon-only buttons in
   * mobile layouts. Default: false.
   */
  hideChildrenOnMobile?: boolean;
}

function renderIcon(
  icon?: string | React.ComponentType<any> | React.ReactNode,
  iconBgTransparent?: boolean
) {
  if (!icon) {
    return null;
  }

  // Case 1: Image URL string
  if (typeof icon === "string") {
    return (
      <img
        src={icon}
        className="h-[32px] w-[32px] sm:h-[42px] sm:w-[42px] shrink-0 rounded-lg sm:rounded-xl object-cover border border-black"
        alt="avatar"
      />
    );
  }

  // Case 2 & 3: React Element or React Component
  return (
    <span
      className={`relative flex h-[32px] w-[32px] sm:h-[42px] sm:w-[42px] shrink-0 items-center justify-center rounded-lg sm:rounded-xl text-primary ${
        iconBgTransparent ? "bg-transparent" : "bg-black"
      }`}
      aria-hidden="true"
    >
      {React.isValidElement(icon) ? (
        icon
      ) : (
        // If it's a React Component type (class or function), instantiate it
        React.createElement(icon as React.ComponentType<any>, {
          className: "h-[16px] w-[16px] sm:h-[20px] sm:w-[20px] stroke-[2]",
        })
      )}
    </span>
  );
}

export function withCustomButton<T extends React.ElementType>(
  WrappedComponent: T
) {
  const CustomButton = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<T> & CustomButtonProps & {
      children?: React.ReactNode;
      className?: string;
    }
  >(({ children, className = "", icon, variant = "default", iconBgTransparent, hideChildrenOnMobile = false, ...props }, ref) => {
    const Component = WrappedComponent as React.ComponentType<any>;
    const variantClasses =
      variant === "outline"
        ? "border border-zinc-700 bg-transparent text-white hover:bg-zinc-800/60 focus-visible:ring-zinc-700"
        : "bg-primary text-black focus-visible:ring-primary";

    // When only an icon is shown on mobile (hideChildrenOnMobile), collapse the
    // button padding so it looks like a proper icon button.
    const mobilePadding = hideChildrenOnMobile
      ? "pl-[2px] pr-[2px] py-[2px] sm:pl-[27px] sm:pr-[2px] sm:py-[2px]"
      : icon
        ? "pl-[20px] pr-[2px] py-[2px] sm:pl-[27px] sm:pr-[2px] sm:py-[2px]"
        : "px-[20px] py-[10px] sm:px-[27px] sm:py-[12px]";

    return (
      <Component
        ref={ref}
        className={`flex shrink-0 items-center gap-[10px] sm:gap-[13px] rounded-lg sm:rounded-xl text-[13px] sm:text-[16px] font-semibold transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${variantClasses} ${mobilePadding} ${className}`}
        {...props}
      >
        <span className={hideChildrenOnMobile ? "hidden sm:inline" : undefined}>
          {children}
        </span>
        {icon && renderIcon(icon, iconBgTransparent)}
      </Component>
    );
  });

  const component =
    (WrappedComponent as React.ComponentType<any>).displayName ||
    (WrappedComponent as { name?: string }).name ||
    "Component";
  CustomButton.displayName = `withCustomButton(${component})`;

  return CustomButton;
}
