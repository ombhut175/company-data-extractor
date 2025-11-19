export const successResponse = (data: any, message = "Success"): unknown => ({
  statusCode: 200,
  success: true,
  message,
  data,
});

export const createdResponse = (data: any, message = "Created"): unknown => ({
  statusCode: 201,
  success: true,
  message,
  data,
});

export const updatedResponse = (data: any, message = "Updated"): unknown => ({
  statusCode: 200,
  success: true,
  message,
  data,
});

export const deletedResponse = (message = "Deleted"): unknown => ({
  statusCode: 200,
  success: true,
  message,
  data: null,
});

export const errorResponse = (
  statusCode: number,
  message: string,
  path?: string,
): unknown => ({
  statusCode,
  message,
  timestamp: new Date().toISOString(),
  path,
});

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
};

export const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
};
