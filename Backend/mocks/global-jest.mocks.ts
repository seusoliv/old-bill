import {Request, Response} from "express";

export interface MockRequestProperties {
  readonly key: string;
  readonly value: any;
}

/**
 * Extends the Express Response to hold the element, that the response was sent with.
 * This enables to implement advanced checks on the provided response data.
 */
export interface TestableResponse<T = any> extends Response {
  body?: T;
}

/**
 * Mocks the Express Request object.
 * @param props Any properties that should be included in the request object.
 */
export function mockRequest(props: MockRequestProperties[] = []): Request {
  const request = {
    query: {}
  } as Request;

  for (const prop of props) {
    request.query[prop.key] = prop.value || undefined;
  }
  return request;
}

/**
 * Mocks the Express Response object.
 */
export function mockResponse(): Response {
  const response = {} as TestableResponse;

  response.status = jest.fn().mockImplementation((status: number) => {
    response.statusCode = status;
    return response;
  });
  response.send = jest.fn().mockImplementation((body?: any) => {
    response.body = body;
    return response;
  });
  return response;
}
