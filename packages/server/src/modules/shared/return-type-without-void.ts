export type ReturnTypeWithoutVoid<TFunction extends (...args: never[]) => unknown> = Exclude<
  ReturnType<TFunction>,
  void
>;

