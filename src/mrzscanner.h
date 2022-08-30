#ifndef MRZSCANNER_H
#define MRZSCANNER_H

#include <node.h>
#include <node_object_wrap.h>


// https://nodejs.org/api/addons.html
class MrzScanner : public node::ObjectWrap {
 public:
  static void Init(v8::Local<v8::Object> exports);
  void *handler;

 private:
  
  explicit MrzScanner();
  ~MrzScanner();

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void LoadModel(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void DecodeFileAsync(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void DecodeBufferAsync(const v8::FunctionCallbackInfo<v8::Value> &args);
};

#endif