import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { Message } from "ct-mui";

type BasicResponse<T> = {
  data: T;
  success: boolean;
  message: string;
};

type ErrorResponse = {
  data: unknown;
  success: boolean;
  message: string;
};

type Response<T> = BasicResponse<T> | ErrorResponse;

const createRequest = <T>(options: AxiosRequestConfig): Promise<T> => {
  const token = localStorage.getItem('panda_wiki_token') || ''
  const config = {
    baseURL: "/",
    timeout: 0,
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
  const service: AxiosInstance = axios.create(config);
  service.interceptors.response.use(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (response: AxiosResponse<Response<T>>) => {
      if (response.status === 200) {
        const res = response.data;
        if (res.success) {
          return res.data;
        }
        Message.error(res.message || "网络异常");
        return Promise.reject(res);
      }
      Message.error(response.statusText);
      return Promise.reject(response);
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        window.location.href = '/login'
        localStorage.removeItem('panda_wiki_token')
      }
      Message.error(error.response?.statusText || "网络异常");
      return Promise.reject(error.response);
    }
  );

  return service(options);
};

const request = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return createRequest<T>({ ...config, method: 'GET', url });
  },
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return createRequest<T>({ ...config, method: 'POST', url, data });
  },
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return createRequest<T>({ ...config, method: 'PUT', url, data });
  },
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return createRequest<T>({ ...config, method: 'DELETE', url });
  },
  // 保持向后兼容
  request: createRequest,
};

export default request;
