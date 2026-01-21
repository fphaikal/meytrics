import { addToast } from "@heroui/react";

// Adapter to match the existing API used in the codebase: toast.success(msg), toast.error(msg)
class ToastAdapter {
  success(message: string) {
    addToast({
      title: "Success",
      description: message,
      color: "success",
    });
  }

  error(message: string) {
    addToast({
      title: "Error",
      description: message,
      color: "danger",
    });
  }

  info(message: string) {
    addToast({
      title: "Info",
      description: message,
      color: "primary",
    });
  }

  warning(message: string) {
    addToast({
      title: "Warning",
      description: message,
      color: "warning",
    });
  }
}

export const toast = new ToastAdapter();
