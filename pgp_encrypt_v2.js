const openpgp = require("openpgp");
const AWS = require("aws-sdk")
const fs = require("fs");
const s3 = new AWS.S3();
const { S3Client, GetObjectAttributesCommand,GetObjectCommand,PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3"); // ES Modules import
const { SSMClient, GetParameterCommand } =require("@aws-sdk/client-ssm"); // ES Modules import
const { TransferClient, StartFileTransferCommand } = require("@aws-sdk/client-transfer"); // ES Modules import
const AdmZip = require('adm-zip');

// const zlib = require('zlib');
// 
const pgpEncryptFile= async  (absolute_local_file_path_to_encrypt,result) => {
  const client = new SSMClient({});
  const ssmParameterName = process.env.ssmParameterName

  const input={
    Name: ssmParameterName,
    WithDecryption: true
  }
  const command = new GetParameterCommand(input);
  const response = await  client.send(command);
  console.log("ssmresponse",response.Parameter.Value)

  const publicKey = await openpgp.readKey({ armoredKey: response.Parameter.Value });
  console.log(publicKey)

  const plainData = fs.readFileSync(`${absolute_local_file_path_to_encrypt}`,'utf8');
  console.log(plainData)
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: plainData }), // input as Message object
    encryptionKeys: publicKey,
  });
  console.log(encrypted)
  fs.writeFileSync(`${absolute_local_file_path_to_encrypt}.gpg`, encrypted);
  const encrypted_file_buffer=fs.readFileSync(`${absolute_local_file_path_to_encrypt}.gpg`) 
  console.log("encrypted_file_buffer",encrypted_file_buffer)



  return `${absolute_local_file_path_to_encrypt}.gpg`;
}

const TransferFile=async (absolute_local_encrypted_file_path,absolute_local_encrypted_file2_path,result) =>{
  // const blobValue=
  try{
  console.log("TransferFile")
  const client = new S3Client({});
  const data=fs.readFileSync(`${absolute_local_encrypted_file_path}`,
    { encoding: 'utf8', flag: 'r' });
    console.log(data)
  const input={
    Body: data,
    Bucket: result[0].bucket_name,
    Key: `temp${absolute_local_encrypted_file_path}`
  }
  const command = new PutObjectCommand(input);
  const response =await  client.send(command);
  const data2=fs.readFileSync(`${absolute_local_encrypted_file2_path}`,
    { encoding: 'utf8', flag: 'r' });
    console.log(data2)
    const input2={
      Body: data2,
      Bucket: result[0].bucket_name,
      Key: `temp${absolute_local_encrypted_file2_path}`
    }
    const command2 = new PutObjectCommand(input2);
    const response2 =await  client.send(command2);
    const connectorId=process.env.connectorId


    const transferClient = new TransferClient({});
    const transferInput = { // StartFileTransferRequest
      ConnectorId: connectorId, // required
      SendFilePaths: [ // FilePaths
        `${result[0].bucket_name}/temp${absolute_local_encrypted_file_path}`,
        `${result[0].bucket_name}/temp${absolute_local_encrypted_file2_path}`

      ],
      // RetrieveFilePaths: [
      //   "STRING_VALUE",
      // ],
      // LocalDirectoryPath: "STRING_VALUE",
      RemoteDirectoryPath: "/upload",
    };
    const transferCommand = new StartFileTransferCommand(transferInput);
    const transferResponse = await transferClient.send(transferCommand);
    console.log(transferResponse)



    const deleteCommand = new DeleteObjectCommand({ // DeleteObjectRequest
      Bucket: result[0].bucket_name, // required
      Key: `temp${absolute_local_encrypted_file_path}` // required
    });
    await client.send(deleteCommand);
    const deleteCommand2 = new DeleteObjectCommand({ // DeleteObjectRequest
      Bucket: result[0].bucket_name, // required
      Key: `temp${absolute_local_encrypted_file2_path}` // required
    });
    await client.send(deleteCommand);
    console.log("TransferFileEnd")


    return true
  }catch(e){
    console.log(e)
    return false
  }

}




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
    //   });
    }catch(e){
      function_output={
        status: false
      }
      console.log("pair not present exception",e)

      return function_output
    }


    // return true
  }))
  return result


}
const ZipFile=async(filePath)=>{
  const zip = new AdmZip();
  zip.addLocalFile(filePath);
  const zipFilePath = `${filePath}.gz`;
  zip.writeZip(zipFilePath, (err) => {
    if(err) {
      console.error(err);
    } else {
      console.log('Zip file created successfully!');
  
    }
  }
  );
  return `${filePath}.gz`
  




  // Create a readable stream to read the file
  // console.log(filePath)
  // const read = fs.createReadStream(filePath);
  // const data=fs.readFileSync(`${filePath}`,
  // { encoding: 'utf8', flag: 'r' });
  // console.log("read",data)
  
  // // Create a transform stream which zips the input file
  // const zip = zlib.createGzip();
  
  // // Create a writable stream to write the zipped data into a new file
  // const write = fs.createWriteStream(`${filePath}.gz`);
  // console.log("zipfunction")
  // filenames = fs.readdirSync('/tmp'); 
  // console.log("\nCurrent directory filenames:"); 
  // filenames.forEach(file => { 
  //   console.log(file); 
  // }); 
  // // fs.readdir('/tmp',(err,files)=>{
  // //   if(err){
  // //     console.log(err)
  // //   }else{
  // //     console.log("\nCurrent directory filenames:");
  // //     files.forEach(file => {
  // //       console.log(file);
  // //   });
  // //   }
  // // })
  // // console.log("write",write)
  // // Pipe the readable stream through the zip transform stream and then into the writable stream
  // data.pipe(zip).pipe(write);
  // return `${filePath}.gz`
}
const zipAndArchive=async(baseFile1Path,baseFile2Path,exexutionStatus,result)=>{
  try{
  const zipFile1Path=await ZipFile(baseFile1Path)
  const zipFile2Path=await ZipFile(baseFile2Path)
  if(exexutionStatus){
    const client = new S3Client({});
    const data=fs.readFileSync(`${zipFile1Path}`,
      { encoding: 'utf8', flag: 'r' });
      console.log(data)
    const input={
      Body: data,
      Bucket: result[0].bucket_name,
      Key: `Success${zipFile1Path}`
    }
    const command = new PutObjectCommand(input);
    const response =await  client.send(command);
    console.log("zipuploadresponse",response)
    const data2=fs.readFileSync(`${zipFile2Path}`,
      { encoding: 'utf8', flag: 'r' });
      console.log(data2)
      const input2={
        Body: data2,
        Bucket: result[0].bucket_name,
        Key: `Success${zipFile2Path}`
      }
      const command2 = new PutObjectCommand(input2);
      const response2 =await  client.send(command2);
  }else{
    const client = new S3Client({});
    const data=fs.readFileSync(`${zipFile1Path}`,
      { encoding: 'utf8', flag: 'r' });
      console.log(data)
    const input={
      Body: data,
      Bucket: result[0].bucket_name,
      Key: `Failure${zipFile1Path}`
    }
    const command = new PutObjectCommand(input);
    const response =await  client.send(command);
    console.log("zipuploadresponse",response)
    const data2=fs.readFileSync(`${zipFile2Path}`,
      { encoding: 'utf8', flag: 'r' });
      console.log(data2)
      const input2={
        Body: data2,
        Bucket: result[0].bucket_name,
        Key: `Failure${zipFile2Path}`
      }
      const command2 = new PutObjectCommand(input2);
      const response2 =await  client.send(command2);
  }
  }catch(e){
    console.log(e)
    return e
  }

}

exports.lambda_handler= async  (event,context) => {
  const result = await check_file_pair(event)
  console.log("resultinhandler",result)
  if(result.status==false){
    console.log("aborting execution")
    return True
  }
  const client = new SSMClient({});
  const ssmFilePrefixParameterName = process.env.ssmFilePrefixParameterName

  const input={
    Name: ssmFilePrefixParameterName,
    WithDecryption: true
  }
  const command = new GetParameterCommand(input);
  const response = await  client.send(command);
  console.log("ssmresponse",response.Parameter.Value)
  console.log("typeof",typeof response.Parameter.Value)
  let prefixList=response.Parameter.Value
  prefixList=prefixList.replace(/'/g, '"')
  prefixList=JSON.parse(prefixList)

  var validFile=false

  for (let i = 0; i < prefixList.length; i++) {
    if(item['s3']['object']['key'].includes(prefixList[i])){
        // console.log("invalid file")
        validFile=true

        // return "invalid file"
    }

  }
  if(!validFile){
    console.log("invalid file")
    return "invalid file"
  }//   var validFile=false

  //   prefixList.map((item)=>{
//     if(!item['s3']['object']['key'].includes(item)){
//         console.log("invalid file")
//         return "invalid file"
//     }
//   })
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

    const buffer1=Buffer.concat(await response.Body.toArray())
    const buffer2=Buffer.concat(await response2.Body.toArray())
    const file1Content=buffer1.toString()
    const file2Content=buffer2.toString()

    console.log("beffer1",buffer1)
    console.log("beffer1",buffer2)
    console.log("file1Content",file1Content)
    console.log(file2Content)
    const file1=fs.writeFileSync(`/tmp/${derived_local_path}`, file1Content, function (err) {
      if (err){
         throw err;
      }else{
      console.log('Replaced!');
      s3.upload({ Bucket: result[0].bucket_name, Key: "check/file.csv", Body: fs.readFileSync(`/tmp/${derived_local_path}`) }).promise()

      }
    });
    const file2=fs.writeFileSync(`/tmp/${derived_local_path2}`, file2Content, function (err) {
      if (err) throw err;
      console.log('Replaced!');
    });
    const encryptedFile1Path=await pgpEncryptFile(`/tmp/${derived_local_path}`,result)
    const encryptedFile2Path=await pgpEncryptFile(`/tmp/${derived_local_path2}`,result)
    console.log("encryptedFile1Path")
    console.log(encryptedFile1Path,encryptedFile2Path)
    const transfer_file=await  TransferFile(encryptedFile1Path,encryptedFile2Path,result)
    if(transfer_file==false){
      const zipAndUpload=await zipAndArchive(`/tmp/${derived_local_path}`,`/tmp/${derived_local_path2}`,false,result)

      return false
    }
    const zipAndUpload=await zipAndArchive(`/tmp/${derived_local_path}`,`/tmp/${derived_local_path2}`,true,result)
    return "successful execution"
  }catch(e){
    console.log(e)
    return e
  }


}
