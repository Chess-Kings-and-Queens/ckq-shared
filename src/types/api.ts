/** The one success envelope backend-2.0 sends (src/utils/response.js createResponse). */
export interface ApiSuccessResponse<T> {
  status: "success";
  message: string;
  code: number;
  data: T;
}
/** The error envelope backend-2.0 sends. */
export interface ApiErrorResponse {
  status: "error";
  message: string;
  code: number;
}
/** Either envelope; narrows on `status`. */
export type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;
