import json
import boto3
import botocore
import gnupg
import os

client = boto3.client('s3')
transfer_client = boto3.client('transfer')



def check_file_pair(event):
    for item in event['Records']:
        file_path= item['s3']['object']['key']
        file_path_array = file_path.split("/")
        length_of_file_path_array=len(file_path_array)-1
        file_name=file_path_array[length_of_file_path_array]
        print(file_name)
        if "Journal" in file_name:
            to_check="Payment"
            current_file="Journal"
        else:
            to_check="Journal"
            current_file="Payment"

        # print(to_check)
        file_name_to_search= file_path.replace(current_file, to_check)
        print(file_name_to_search)
        try:

            response = client.head_object(Bucket=item['s3']['bucket']['name'], Key=file_name_to_search)
            print(f"Key: '{file_name_to_search}' found!")

        except botocore.exceptions.ClientError as e:
            if e.response["Error"]["Code"]=="404":
                print(f"Key: '{file_name_to_search}' does not exist!")
                return [False]
            else:
                print("something went wrong")
                return [False]
        # print(item['s3']['object']['key'])

        return [True,file_name_to_search,item['s3']['bucket']['name'],current_file,to_check]


def pgp_encrypt_file(file_path, recipient_key_path):
    gpg = gnupg.GPG()
    key_data = open(recipient_key_path).read()
    # print(key_data)
    import_result = gpg.import_keys(key_data)
    gpg.trust_keys(import_result.fingerprints, 'TRUST_ULTIMATE')
    # print(import_result.results)

    with open(file_path, 'rb') as file:
        status = gpg.encrypt_file(file, recipients=import_result.results[0]['fingerprint'],output=f"{file_path}.gpg")

    return f"{file_path}.gpg"

def transfer_file(encrypted_file1_path,encrypted_file2_path):
    print("a")
    retrieve_file_path1=encrypted_file1_path[5:]
    retrieve_file_path2=encrypted_file2_path[5:]

    transfer_client = client.start_file_transfer(
    ConnectorId='skkdkd',
    SendFilePaths=[
        encrypted_file1_path,
        encrypted_file2_path

    ],
    RemoteDirectoryPath='/upload'
    )

# def make_intermediate_directories(directories_path):
#     if "/" in directories_path:
#         array_of_path= directories_path.split('/')
#         for index,directory in enumerate(array_of_path):
#             if index==0:
#                 base_dir='/tmp' 
#                 os.mkdir()
#             else:
#                 base_dir='/tmp'
        

def lambda_handler(event, context):
    # TODO implement
    result=check_file_pair(event)
    s3 = boto3.resource('s3')
    print(result[0])
    if result[0]:
        try:
            # make_intermediate_directories(result[1])
            remote_path_in_array=result[1].split("/")
            print("if condition")
            derived_local_path=remote_path_in_array[len(remote_path_in_array)-1]
            derived_local_path2 = derived_local_path.replace(result[4], result[3])
            print("test1",derived_local_path)
            print("test2",derived_local_path2)

            response = s3.meta.client.download_file(
                result[2],
                result[1],
                f"/tmp/{derived_local_path}"
            )
            response2 = s3.meta.client.download_file(
                result[2],
                result[1],
                f"/tmp/{derived_local_path2}"
            )
            s3.meta.client.download_file(
                'demo-bucket-sftp-start-ica',
                'public_key/mypubkey.asc',
                f"/tmp/mypubkey.asc"
            )   
            recipient_key_path="/tmp/mypubkey.asc"
            encrypted_file1_path=pgp_encrypt_file(f"/tmp/{derived_local_path}",recipient_key_path)
            encrypted_file2_path=pgp_encrypt_file(f"/tmp/{derived_local_path2}",recipient_key_path)
            transfer_file(encrypted_file1_path,encrypted_file2_path)



        except:
            print(response)
            print(response2)
    else:
        print("Pair is not found")
    print("check")

    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }


