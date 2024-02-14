// const gpg = require('gpg');
// const fs = require('fs');
// const { promisify } = require('util');


// const pgpEncryptFile = async (filePath, recipientKeyPath) => {
//     try {
//       const keyData = fs.readFileSync(recipientKeyPath, 'utf8');
//       console.log(keyData)
//     //   const result = await gpg.importKey(keyData)
//     //   console.log(result)

//       const result = await promisify(gpg.importKey)({ key: keyData });
//       console.log(result)

//       const keyIndex = result.keys.length - 1;
//       const content = fs.readFileSync(filePath, 'utf8');
//       const encryptedData = await promisify(gpg.encrypt)({
//         data: content,
//         recipients: result.keys[keyIndex].keyid,
//         armor: true
//       });
//       fs.writeFileSync(`${filePath}.gpg`, encryptedData);
//       return `${filePath}.gpg`;
//     } catch (error) {
//       console.error(error);
//       throw error;
//     }
//   };
//   recipientKeyPath="../mypubkey.asc"
//   filePath="../SampleCSVFile_2kb.csv"
//   pgpEncryptFile(filePath,recipientKeyPath)

// encrypt-file.js
const openpgp = require("openpgp");
const AWS = require("aws-sdk")
const fs = require("fs");
// const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
const s3 = new AWS.S3();
const { S3Client, GetObjectAttributesCommand,GetObjectCommand } = require("@aws-sdk/client-s3"); // ES Modules import





const publicKeyArmored = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mDMEZcPLKxYJKwYBBAHaRw8BAQdAwEDU/bAj9gvcmSnI8Y0+97jISKX88JLOu62p
+ZhCe/G0HWRhbmlzaCA8ZHJlaG1hbjA3M0BnbWFpbC5jb20+iJkEExYKAEEWIQTm
rY61V7l54lRzZk0VzC1a3jBnawUCZcPLKwIbAwUJBaOagAULCQgHAgIiAgYVCgkI
CwIEFgIDAQIeBwIXgAAKCRAVzC1a3jBna9xqAQDxTdVa12Atw8vGVnWxxx7aNjqu
Iq60BMUmPBA3bFTVIQEAhRBBT4leGnflmisli6HkZ4afZ1p+VVDtvK51GYVl7QW4
OARlw8srEgorBgEEAZdVAQUBAQdAf0tQ95oHwVhfm7ASWoaWZYC59dThodm7dZZG
2mmToEcDAQgHiH4EGBYKACYWIQTmrY61V7l54lRzZk0VzC1a3jBnawUCZcPLKwIb
DAUJBaOagAAKCRAVzC1a3jBnawhtAQD3ZTmTmaKuJ5imG22ctueFiT8lpCmVf2cv
E1vtXXB5fgEAsyflNGC46nqZsy30F6e2W7A9RYk7MhwmkycOX6G26ww=
=vUNV
-----END PGP PUBLIC KEY BLOCK-----`

// encrypt();

exports.encrypt= async  (event,context) => {
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  console.log(publicKey)

  const plainData = fs.readFileSync("./SampleCSVFile_2kb.csv",'utf8');
  console.log(plainData)
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: plainData }), // input as Message object
    encryptionKeys: publicKey,
  });
  console.log(encrypted)
  fs.writeFileSync("/tmp/encrypted-secrets.txt", encrypted);
  // s3.upload({ Bucket: "bucketName", Key: "/tmp", Body: fs.createReadStream("/tmp/encrypted-secrets.txt") }).promise(),
  const encrypted_file_buffer=fs.readFileSync("/tmp/encrypted-secrets.txt") 
  console.log("encrypted_file_buffer",encrypted_file_buffer)
  // const params = {Bucket: 'demo-bucket-sftp-start-ica', Key: '/tmp', Body: fs.createReadStream("/tmp/encrypted-secrets.txt")};
  await Promise.all([
    s3.upload({ Bucket: "demo-bucket-sftp-start-ica", Key: "/check", Body: fs.readFileSync("/tmp/encrypted-secrets.txt") }).promise()
    ]);
  // await s3.upload(params,function(err,data){
  //   if(err){
  //     console.log(err)
  //   }else{
  //     console.log(data)
  //   }
  // })
  console.log("uploaded")
  return "a";
}

// const check_file_pair= async(event)=>{
//   await Promise.all(event["Records"].map(async(item)=>{
//     file_path=item['s3']['object']['key']
//     file_path_array = file_path.split("/")
//     index=file_path_array.length-1
//     file_name=file_path_array[index]
//     console.log("file_name",file_name)
//     if(file_name.includes("Journal")){
//       to_check="Payment"
//       current_file="Journal"
//     }else if(file_name.includes("Payment")){
//       to_check="Journal"
//       current_file="Payment"
//     }
//     file_name_to_search= file_path.replace(current_file, to_check)
//     console.log("file_name_to_search",file_name_to_search)
//     try{
//       const input = { // GetObjectAttributesRequest
//         Bucket: item['s3']['bucket']['name'], // required
//         Key: file_name_to_search, // required
//       };
//       const client = new S3Client({});

//       const command = new GetObjectAttributesCommand(input);
//       await client.send(command).then((response)=>console.log(response)).catch((e)=>console.log(e))
      
//       // console.log("GetObjectAttributesCommand",response)
//             function_output={
//             status: true,
//             file_name_to_search: file_name_to_search,
//             bucket_name: item['s3']['bucket']['name'],
//             current_file: current_file,
//             to_check: to_check
//           }
//           // console.log("pair not present exceptio",e)
    
//           return function_output
       
//     //   // client.head_object(Bucket=item['s3']['bucket']['name'], Key=file_name_to_search)
//     //   params={
//     //     Bucket:item['s3']['bucket']['name'],
//     //   Key:file_name_to_search
//     // }
//     //     s3.headObject(params, function(err, data) {
//     //     if (err) {
//     //       console.log("pair not present s3api",err, err.stack);
//     //       function_output={
//     //         status: false
//     //       }
//     //       return function_output
//     //     }// an error occurred
//     //     else{ 
//     //       console.log(`${file_name_to_search} found!`,data);  
//     //       function_output={
//     //         status: true,
//     //         file_name_to_search: file_name_to_search,
//     //         bucket_name: item['s3']['bucket']['name'],
//     //         current_file: current_file,
//     //         to_check: to_check
//     //       }
//     //       // console.log("pair not present exceptio",e)
    
//     //       return function_output
            
//     //      }      // successful response

//     //   });
//     }catch(e){
//       function_output={
//         status: false
//       }
//       console.log("pair not present exception",e)

//       return function_output
//     }


//     // console.log("file_path",file_path)
//     return true
//   })).then((values)=>
//     console.log(values)
//   ).catch((e)=>
//   console.log(e))
// }


const check_file_pair= async(event)=>{
  const result=await Promise.all(event["Records"].map(async(item)=>{
    file_path=item['s3']['object']['key']
    file_path_array = file_path.split("/")
    index=file_path_array.length-1
    file_name=file_path_array[index]
    console.log("file_name",file_name)
    if(file_name.includes("Journal")){
      to_check="Payment"
      current_file="Journal"
    }else if(file_name.includes("Payment")){
      to_check="Journal"
      current_file="Payment"
    }
    file_name_to_search= file_path.replace(current_file, to_check)
    console.log("file_name_to_search",file_name_to_search)
    try{
      const input = { // GetObjectAttributesRequest
        Bucket: item['s3']['bucket']['name'], // required
        Key: file_name_to_search, // required
        ObjectAttributes: ["ETag"]
      };
      const client = new S3Client({});

      const command = new GetObjectAttributesCommand(input);
      const response=await client.send(command)
      console.log("await response",response)
      
      // console.log("GetObjectAttributesCommand",response)
            function_output={
            status: true,
            file_name_to_search: file_name_to_search,
            bucket_name: item['s3']['bucket']['name'],
            current_file: current_file,
            to_check: to_check
          }
          // console.log("pair not present exceptio",e)
    
          return function_output
       
    //   // client.head_object(Bucket=item['s3']['bucket']['name'], Key=file_name_to_search)
    //   params={
    //     Bucket:item['s3']['bucket']['name'],
    //   Key:file_name_to_search
    // }
    //     s3.headObject(params, function(err, data) {
    //     if (err) {
    //       console.log("pair not present s3api",err, err.stack);
    //       function_output={
    //         status: false
    //       }
    //       return function_output
    //     }// an error occurred
    //     else{ 
    //       console.log(`${file_name_to_search} found!`,data);  
    //       function_output={
    //         status: true,
    //         file_name_to_search: file_name_to_search,
    //         bucket_name: item['s3']['bucket']['name'],
    //         current_file: current_file,
    //         to_check: to_check
    //       }
    //       // console.log("pair not present exceptio",e)
    
    //       return function_output
            
    //      }      // successful response

    //   });
    }catch(e){
      function_output={
        status: false
      }
      console.log("pair not present exception",e)

      return function_output
    }


    // console.log("file_path",file_path)
    return true
  }))
  return result
//   .then((values)=>
//     console.log(values)
//   ).catch((e)=>{
//   if(e['$metadata']['httpStatusCode']==400){
//     console.log("file pair not found")
//     return {
//       status: false

//     }
//   }else{
//     console.log("something went wrong")
//     return {
//       status: false

//     }
//   }
//   // console.log("error",e['$metadata']['httpStatusCode'])
// }
//   )
}


exports.lambda_handler= async  (event,context) => {
  const result = await check_file_pair(event)
  console.log("resultinhandler",result)
  if(result.status==false){
    console.log("aborting execution")
    return True
  }
  try{
    remote_path_in_array=result[0].file_name_to_search.split("/")
    derived_local_path=remote_path_in_array[remote_path_in_array.length-1]
    console.log("derived_local_pathbefore",derived_local_path)
    derived_local_path2 = derived_local_path.replace(result[0].to_check, result[0].current_file)
    console.log("derived_local_path",derived_local_path)
    console.log("derived_local_path2",derived_local_path2)
    const input = { // GetObjectAttributesRequest
      Bucket: result[0].bucket_name, // required
      Key: result[0].file_name_to_search // required
      // ObjectAttributes: ["ETag"]
    };
    const input2={
      Bucket: result[0].bucket_name, // required
      Key: result[0].file_name_to_search.replace(derived_local_path,derived_local_path2) // required
    }
    const client = new S3Client({});

    const command = new GetObjectCommand(input);
    const command2 = new GetObjectCommand(input2);

    const response=await client.send(command)
    const response2=await client.send(command2)

    console.log("await response",response)
    console.log("await response2",response2)
  }catch(e){
    console.log(e)
  }

  // const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  // console.log(publicKey)

  // const plainData = fs.readFileSync("./SampleCSVFile_2kb.csv",'utf8');
  // console.log(plainData)
  // const encrypted = await openpgp.encrypt({
  //   message: await openpgp.createMessage({ text: plainData }), // input as Message object
  //   encryptionKeys: publicKey,
  // });
  // console.log(encrypted)
  // fs.writeFileSync("/tmp/encrypted-secrets.txt", encrypted);
  // // s3.upload({ Bucket: "bucketName", Key: "/tmp", Body: fs.createReadStream("/tmp/encrypted-secrets.txt") }).promise(),
  // const encrypted_file_buffer=fs.readFileSync("/tmp/encrypted-secrets.txt") 
  // console.log("encrypted_file_buffer",encrypted_file_buffer)
  // // const params = {Bucket: 'demo-bucket-sftp-start-ica', Key: '/tmp', Body: fs.createReadStream("/tmp/encrypted-secrets.txt")};
  // await Promise.all([
  //   s3.upload({ Bucket: "demo-bucket-sftp-start-ica", Key: "/check", Body: fs.readFileSync("/tmp/encrypted-secrets.txt") }).promise()
  //   ]);
  // // await s3.upload(params,function(err,data){
  // //   if(err){
  // //     console.log(err)
  // //   }else{
  // //     console.log(data)
  // //   }
  // // })
  // console.log("uploaded")
  return "a";
}
