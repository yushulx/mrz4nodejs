#ifndef MRZSCANNER_H
#define MRZSCANNER_H

#include <node.h>
#include <node_object_wrap.h>

class MrzScanner : public node::ObjectWrap {
 public:
  static void Init(v8::Local<v8::Object> exports);

 private:
  explicit MrzScanner(double value = 0);
  ~MrzScanner();

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void PlusOne(const v8::FunctionCallbackInfo<v8::Value>& args);

  double value_;
};

#endif