#include <node.h>
#include <node_buffer.h>
#include <string.h>
#include <uv.h>
#include "DynamsoftCore.h"
#include "DynamsoftLabelRecognizer.h"
#include "mrzscanner.h"

using namespace v8;

#define MRZ_NO_MEMORY 0
#define MRZ_SUCCESS 1
#define DEFAULT_MEMORY_SIZE 4096

typedef enum
{
	NO_BUFFER,
	RGB_BUFFER,
} BufferType;

struct MRZWorker
{
	void *handler;
	uv_work_t request;			   // libuv
	Persistent<Function> callback; // javascript callback
	char filename[128];			   // file name
	DLR_ResultArray *pResults;	   // result pointer
	unsigned char *buffer;
	int size;			   // file size
	int errorCode;		   // detection error code
	int width;			   // image width
	int height;			   // image height
	BufferType bufferType; // buffer type
	int stride;			   // image stride
};

/*
 *	uv_work_cb
 */
static void DetectionWorking(uv_work_t *req)
{
	// get the reference to MRZWorker
	MRZWorker *worker = static_cast<MRZWorker *>(req->data);
	if (!worker->handler)
	{
		printf("MRZ handler not initialized.\n");
		return;
	}

	// initialize Dynamsoft Label Recognizer
	DLR_ResultArray *pResults = NULL;

	// decode mrz image
	int ret = 0;
	switch (worker->bufferType)
	{
	case RGB_BUFFER:
	{
		if (worker->buffer)
		{
			int width = worker->width, height = worker->height, stride = worker->stride;
			ImagePixelFormat format = IPF_RGB_888;

			if (width == stride)
			{
				format = IPF_GRAYSCALED;
			}
			else if (width * 3 == stride)
			{
				format = IPF_RGB_888;
			}
			else if (width * 4 == stride)
			{
				format = IPF_ARGB_8888;
			}

			ImageData data;
			data.bytes = worker->buffer;
			data.width = width;
			data.height = height;
			data.stride = stride;
			data.format = format;
			data.bytesLength = stride * height;

			ret = DLR_RecognizeByBuffer(worker->handler, &data, "locr");
		}
	}
	break;
	default:
	{
		ret = DLR_RecognizeByFile(worker->handler, worker->filename, "locr");
	}
	}

	if (ret)
	{
		printf("Detection error: %s\n", DLR_GetErrorString(ret));
	}

	DLR_GetAllResults(worker->handler, &pResults);

	// save results to MRZWorker
	worker->errorCode = ret;
	worker->pResults = pResults;
}

/*
 *	uv_after_work_cb
 */
static void DetectionDone(uv_work_t *req, int status)
{
	Isolate *isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	Local<Context> context = isolate->GetCurrentContext();

	// get the reference to MRZWorker
	MRZWorker *worker = static_cast<MRZWorker *>(req->data);

	// get mrz results
	DLR_ResultArray *pResults = worker->pResults;
	int errorCode = worker->errorCode;

	// array for storing mrz results
	Local<Array> mrzResults = Array::New(isolate);

	if (pResults)
	{
		int count = pResults->resultsCount;
		int index = 0;
		for (int i = 0; i < count; i++)
		{
			DLR_Result *mrzResult = pResults->results[i];
			int lCount = mrzResult->lineResultsCount;
			for (int j = 0; j < lCount; j++)
			{
				// printf("Line result %d: %s\n", j, mrzResult->lineResults[j]->text);

				DM_Point *points = mrzResult->lineResults[j]->location.points;
				int x1 = points[0].x;
				int y1 = points[0].y;
				int x2 = points[1].x;
				int y2 = points[1].y;
				int x3 = points[2].x;
				int y3 = points[2].y;
				int x4 = points[3].x;
				int y4 = points[3].y;

				Local<Object> result = Object::New(isolate);
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "confidence", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, mrzResult->lineResults[j]->confidence));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "text", NewStringType::kNormal).ToLocalChecked(), String::NewFromUtf8(isolate, mrzResult->lineResults[j]->text, NewStringType::kNormal).ToLocalChecked());
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x1", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x1));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y1", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y1));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x2", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x2));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y2", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y2));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x3", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x3));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y3", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y3));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x4", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x4));
				result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y4", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y4));
				mrzResults->Set(context, Number::New(isolate, index), result);
				index += 1;
			}
		}

		// release memory of mrz results
		DLR_FreeResults(&pResults);
	}

	// run the callback
	const unsigned argc = 2;
	Local<Number> err = Number::New(isolate, errorCode);
	Local<Value> argv[argc] = {err, mrzResults};
	Local<Function> cb = Local<Function>::New(isolate, worker->callback);
	cb->Call(context, Null(isolate), argc, argv);

	// release memory of MRZWorker
	delete worker;
}

/*
 *	initLicense(license)
 */
void InitLicense(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	Local<Context> context = isolate->GetCurrentContext();

	String::Utf8Value license(isolate, args[0]);
	char *pszLicense = *license;
	char errorMsgBuffer[512];
	// Click https://www.dynamsoft.com/customer/license/trialLicense/?product=MRZ to get a trial license.
	int ret = DLR_InitLicense(pszLicense, errorMsgBuffer, 512);
	printf("InitLicense: %s", errorMsgBuffer);
	args.GetReturnValue().Set(Number::New(isolate, ret));
}

/*
 *	decodeFileAsync(fileName, mrzTypes, callback, template)
 */
void MrzScanner::DecodeFileAsync(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	MrzScanner *obj = ObjectWrap::Unwrap<MrzScanner>(args.Holder());
	Local<Context> context = isolate->GetCurrentContext();

	// get arguments
	String::Utf8Value fileName(isolate, args[0]); // file name
	char *pFileName = *fileName;
	Local<Function> cb = Local<Function>::Cast(args[1]); // javascript callback function

	// initialize MRZWorker
	MRZWorker *worker = new MRZWorker;
	worker->handler = obj->handler;
	worker->request.data = worker;
	strcpy(worker->filename, pFileName);
	worker->callback.Reset(isolate, cb);
	worker->pResults = NULL;
	worker->buffer = NULL;
	worker->bufferType = NO_BUFFER;

	uv_queue_work(uv_default_loop(), &worker->request, (uv_work_cb)DetectionWorking, (uv_after_work_cb)DetectionDone);
}

/*
 *	decodeBuffer(buffer, width, height, stride, mrzTypes, callback, template)
 */
void MrzScanner::DecodeBufferAsync(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = Isolate::GetCurrent();
	MrzScanner *obj = ObjectWrap::Unwrap<MrzScanner>(args.Holder());
	Local<Context> context = isolate->GetCurrentContext();

	// get arguments
	unsigned char *buffer = (unsigned char *)node::Buffer::Data(args[0]); // file stream
	int width = args[1]->Int32Value(context).ToChecked();				  // image width
	int height = args[2]->Int32Value(context).ToChecked();				  // image height
	int stride = args[3]->Int32Value(context).ToChecked();				  // stride
	int iFormat = args[4]->Int32Value(context).ToChecked();				  // mrz types
	Local<Function> cb = Local<Function>::Cast(args[5]);				  // javascript callback function

	// initialize MRZWorker
	MRZWorker *worker = new MRZWorker;
	worker->handler = obj->handler;
	worker->request.data = worker;
	worker->callback.Reset(isolate, cb);
	worker->pResults = NULL;
	worker->buffer = buffer;
	worker->width = width;
	worker->height = height;
	worker->bufferType = RGB_BUFFER;
	worker->stride = stride;

	uv_queue_work(uv_default_loop(), &worker->request, (uv_work_cb)DetectionWorking, (uv_after_work_cb)DetectionDone);
}

/*
 *	GetVersionNumber()
 *
 *	returns the version number of the dll
 */
void GetVersionNumber(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = Isolate::GetCurrent();
	args.GetReturnValue().Set(String::NewFromUtf8(
								  isolate, DLR_GetVersion())
								  .ToLocalChecked());
}

MrzScanner::MrzScanner()
{
	handler = DLR_CreateInstance();
}

MrzScanner::~MrzScanner()
{
	DLR_DestroyInstance(handler);
}

void MrzScanner::Init(Local<Object> exports)
{
	Isolate *isolate = exports->GetIsolate();
	Local<Context> context = isolate->GetCurrentContext();

	Local<ObjectTemplate> addon_data_tpl = ObjectTemplate::New(isolate);
	addon_data_tpl->SetInternalFieldCount(1); // 1 field for the MrzScanner::New()
	Local<Object> addon_data =
		addon_data_tpl->NewInstance(context).ToLocalChecked();

	// Prepare constructor template
	Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New, addon_data);
	tpl->SetClassName(String::NewFromUtf8(isolate, "MrzScanner").ToLocalChecked());
	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	// Prototype
	NODE_SET_PROTOTYPE_METHOD(tpl, "loadModel", LoadModel);
	NODE_SET_PROTOTYPE_METHOD(tpl, "decodeFileAsync", DecodeFileAsync);
	NODE_SET_PROTOTYPE_METHOD(tpl, "decodeBufferAsync", DecodeBufferAsync);

	Local<Function> constructor = tpl->GetFunction(context).ToLocalChecked();
	addon_data->SetInternalField(0, constructor);
	exports->Set(context, String::NewFromUtf8(isolate, "MrzScanner").ToLocalChecked(),
				 constructor)
		.FromJust();
}

void MrzScanner::New(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  if (args.IsConstructCall()) {
    // Invoked as constructor: `new MrzScanner(...)`
    MrzScanner* obj = new MrzScanner();
    obj->Wrap(args.This());
    args.GetReturnValue().Set(args.This());
  } else {
    // Invoked as plain function `MrzScanner(...)`, turn into construct call.
    const int argc = 1;
    Local<Value> argv[argc] = { args[0] };
    Local<Function> cons =
        args.Data().As<Object>()->GetInternalField(0).As<Function>();
    Local<Object> result =
        cons->NewInstance(context, argc, argv).ToLocalChecked();
    args.GetReturnValue().Set(result);
  }
}

/*
 *	LoadModel(fileName)
 */
void MrzScanner::LoadModel(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();

	MrzScanner *obj = ObjectWrap::Unwrap<MrzScanner>(args.Holder());

	String::Utf8Value fileName(isolate, args[0]); // file name
	char *pFileName = *fileName;

	char errorMsgBuffer[512];
	int ret = DLR_AppendSettingsFromFile(obj->handler, pFileName, errorMsgBuffer, 512);
	printf("Load MRZ model: %s\n", errorMsgBuffer);

	args.GetReturnValue().Set(Number::New(isolate, ret));
}

void Init(Local<Object> exports)
{
	NODE_SET_METHOD(exports, "initLicense", InitLicense);
	NODE_SET_METHOD(exports, "getVersionNumber", GetVersionNumber);
	MrzScanner::Init(exports);
}

NODE_MODULE(MRZ, Init)