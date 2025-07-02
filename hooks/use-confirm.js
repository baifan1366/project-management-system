"use client";

import * as React from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, Info, HelpCircle, XCircle } from "lucide-react";
import { useTranslations } from 'next-intl';

const CONFIRM_LIMIT = 5;

const actionTypes = {
  ADD_CONFIRM: "ADD_CONFIRM",
  UPDATE_CONFIRM: "UPDATE_CONFIRM",
  DISMISS_CONFIRM: "DISMISS_CONFIRM",
  REMOVE_CONFIRM: "REMOVE_CONFIRM",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const confirmTimeouts = new Map();

export const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_CONFIRM":
      return {
        ...state,
        confirms: [action.confirm, ...state.confirms].slice(0, CONFIRM_LIMIT),
      };

    case "UPDATE_CONFIRM":
      return {
        ...state,
        confirms: state.confirms.map((c) =>
          c.id === action.confirm.id ? { ...c, ...action.confirm } : c
        ),
      };

    case "DISMISS_CONFIRM": {
      const { confirmId } = action;
      
      return {
        ...state,
        confirms: state.confirms.map((c) =>
          c.id === confirmId || confirmId === undefined
            ? {
                ...c,
                open: false,
              }
            : c
        ),
      };
    }
    
    case "REMOVE_CONFIRM":
      if (action.confirmId === undefined) {
        return {
          ...state,
          confirms: [],
        };
      }
      return {
        ...state,
        confirms: state.confirms.filter((c) => c.id !== action.confirmId),
      };
      
    default:
      return state;
  }
};

const listeners = [];

let memoryState = { confirms: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function getIcon(variant) {
  switch (variant) {
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "error":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "success":
      return <Check className="h-5 w-5 text-emerald-500" />;
    case "question":
      return <HelpCircle className="h-5 w-5 text-blue-500" />;
    case "info":
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
}

export function ConfirmDialog({ 
  open,
  title, 
  description, 
  onConfirm, 
  onCancel, 
  confirmText, 
  cancelText,
  variant = "info",
  id
}) {
  const tConfirm = useTranslations('confirmation');
  
  const finalConfirmText = confirmText || tConfirm('confirm');
  const finalCancelText = cancelText || tConfirm('cancel');

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    dispatch({ type: "DISMISS_CONFIRM", confirmId: id });
    setTimeout(() => {
      dispatch({ type: "REMOVE_CONFIRM", confirmId: id });
    }, 100);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    dispatch({ type: "DISMISS_CONFIRM", confirmId: id });
    setTimeout(() => {
      dispatch({ type: "REMOVE_CONFIRM", confirmId: id });
    }, 100);
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleCancel();
    }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon(variant)}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex items-center gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            className="mt-0"
          >
            {finalCancelText}
          </AlertDialogCancel>
          <Button 
            onClick={handleConfirm}
            variant={variant === "error" ? "destructive" : "default"}
          >
            {finalConfirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function confirm({
  title,
  description,
  variant = "info",
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) {
  const id = genId();

  dispatch({
    type: "ADD_CONFIRM",
    confirm: {
      id,
      title,
      description,
      variant,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      open: true,
    },
  });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_CONFIRM", confirmId: id }),
    update: (props) =>
      dispatch({
        type: "UPDATE_CONFIRM",
        confirm: { ...props, id },
      }),
  };
}

// Add a Promise-based confirm function
function confirmAsync({
  title,
  description,
  variant = "info",
  confirmText,
  cancelText
}) {
  return new Promise((resolve) => {
    const id = genId();
    
    dispatch({
      type: "ADD_CONFIRM",
      confirm: {
        id,
        title,
        description,
        variant,
        confirmText,
        cancelText,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
        open: true,
      },
    });
  });
}

export function useConfirm() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    confirm,
    confirmAsync,
    dismiss: (confirmId) => dispatch({ type: "DISMISS_CONFIRM", confirmId }),
  };
}

export function ConfirmProvider({ children }) {
  const { confirms } = useConfirm();
  
  return (
    <>
      {children}
      {confirms.map((props) => (
        <ConfirmDialog key={props.id} {...props} />
      ))}
    </>
  );
} 