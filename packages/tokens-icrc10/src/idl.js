export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    icrc10_supported_standards: IDL.Func(
      [],
      [IDL.Vec(IDL.Record({ url: IDL.Text, name: IDL.Text }))],
      ["query"],
    ),
  });
};
