declare module 'react-hook-form' {
  export type FieldValues = Record<string, any>
  export type UseFormProps<TFieldValues = FieldValues, TContext = any, TTransformedValues = TFieldValues> = any
  export type UseFormReturn<TFieldValues = FieldValues, TContext = any, TTransformedValues = TFieldValues> = any
  export function useForm<TFieldValues = FieldValues, TContext = any, TTransformedValues = TFieldValues>(props?: UseFormProps<TFieldValues, TContext, TTransformedValues>): UseFormReturn<TFieldValues, TContext, TTransformedValues>
  export function Controller(props: any): any
  export function useFormContext(): any
  export function useWatch(props: any): any
  export function useFieldArray(props: any): any
  export function useFormState(props: any): any
  export function useController(props: any): any
  export function useFormStateSubscribe(props: any): any
  export type UseFormRegister<TFieldValues = FieldValues> = any
  export type Path<T> = any
  export type SubmitHandler<TFieldValues> = any
}
