[![Contentstack](https://www.contentstack.com/docs/static/images/contentstack.png)](https://www.contentstack.com/)

Contentstack is a headless CMS with an API-first approach. It is a CMS that developers can use to build powerful cross-platform applications in their favorite languages. Build your application frontend, and Contentstack will take care of the rest. [Read More](https://www.contentstack.com/).

## Contentstack publishing script

Contentstack publishing script lets you auto publish your entries and assets depending upon the cases given below

- Publish the unpublished/draft entries
- Publish the assets of a stack 
- Publish the entries of a stack
- Unpublish entries/assets of a stack
- Publish edits made on entries on particular environment
- Publish entries/assets from one environment to other
- Publish Localized entries when nonlocalized field of master Entry is updated
- Update and publish entries when a new field is added to content type
- Revert published entries through script from logs

*NOTE:* **Publishing process will fail if Required/Mandatory fields are empty**

**This Script uses Bulk Publish api to publish the contents, However if the bulk Operation is not enabled for your organization, set the bulkPublish/Unpublish flag in config to false.We recommend using Bulk publish to avoid slow/less failed publishing due to single entry/asset publish api.**


### Usage
#### Install dependencies:

Before we dive into the use cases, let's ensure that we install the required dependencies and make changes in the configuration files which will remain common for all uses cases that we have discussed

```sh
$ npm install 
```
#### Specify Stack details in config file(config/index.js)
```sh
$ module.exports = {
  apikey:'', //api key of the stack
  apiEndPoint:'https://api.contentstack.io',
  cdnEndPoint:'https://cdn.contentstack.io',
  manageToken:'',//management token for the stack
}
```

### Cases


#### Case 1) Publish Draft entries(latest version) on particular environment

**Specify case details in config file**

```sh
$ module.exports = {
  publish_unpublished_env:{
    contentTypes:['test'], //list of contentTypes
    sourceEnv : 'staging', //sourceEnv
    environments:['testdin1996'],
    locales:['en-us'],
    bulkPublish: true, //keep this flag as false if bulkPublish feature is not present in your plan
  }
}  
```
**Start publishing**

```sh
$ npm run publish_unpublish
```


#### Case 2) Publish all assets of the stack

**Specify case details in config file**

```sh
$ module.exports = {
  publish_assets:{
    environments:['bulktest'],
    folderUid:"cs_root", //Id of the folder to be published, cs_root for assets
    bulkPublish: true,
  }
}  
```
**Start publishing**

```sh
$ npm run publish_assets
```

#### Case 3) Publish all entries of the stack

**Specify case details in config file**

```sh
$ module.exports = {
  publish_entries:{
    contentTypes:['redirect_rule'], //list of contentTypes which needs to be published
    locales:['en-us'], //list of locales which need to be considered for mentioned CTs
    environments:['bulktest'], // destination publish environments
    publishAllContentTypes : false, //if you want to publish entire contentTypes
    bulkPublish:true
  } 
}  
```
**Start publishing**

```sh
$ npm run publish_entries
```
#### Case 4) UnPublish all entries/assets of the stack published on particular Environment

**Specify case details in config file**

```sh
$ module.exports = {
  bulkUnpublish :{
    filter:{
      environment: 'bulktest', //source environment
      content_type_uid: '', //Add content type uid to be unpublished. Keep this blank to consider all
      locale: 'en-us', //locale filters
      type:'entry_published,asset_published' //entries and assets both will be unpublished, remove asset_published if u want to unpublish only entries and vice versa.
    },
    deliveryToken:'' //deliveryToken of the  source environment,
    bulkUnpublish: true,
  }
}  
```
**Start publishing**

```sh
$ npm run unpublish
```
#### Case 5) Publish edits made on entries published to specific environment

**Specify case details in config file**

```sh
$ module.exports = {
    publish_edits_on_env: {
    contentTypes: ['test','helloworld'], 
    sourceEnv: 'test',
    environments: ['test'],
    locales: ['en-us',],
    bulkPublish: true,
  },
}  
```
**Start publishing**

```sh
$ npm run publish_edits
```
#### Case 6) Publish entries and assets from one environment to other

**Specify case details in config file**

```sh
$ module.exports = {
  cross_env_publish:{
     filter: {
      environment: 'bulktest', // source environment
      content_type_uid: '', // //Add content type uid to be published. Keep this blank to consider all
      locale: 'en-us', // locale filters
      type: 'asset_published,entry_published',  //entries and assets both will be published, remove asset_published if u want to publish only entries and vice versa.
    },
    deliveryToken: '', // deliveryToken of the source environment
    destEnv:[''],     //environments where it needs to be published
    bulkPublish: true,
  }
}  
```
**Start publishing**

```sh
$ npm run cross_publish
```
#### Case 7) Publish Localized entries when nonlocalized field of master Entry is updated

**Specify case details in config file**

```sh
$ module.exports = {
  nonlocalized_field_changes: {
    sourceEnv: 'production', //source Environment
    contentTypes: ['testdin'],
    environments: ['production'], //publishing Environments
    bulkPublish: true,
  },
}  
```

**Start publishing**

```sh
$ npm run publish_localized
```
#### Case 8) Update and publish entries when a new field is added to contentType

**Specify case details in config file**

```sh
$ module.exports = {
  addFields: {
    deleteFields: ['updated_by', 'created_by', 'created_at', 'updated_at', '_version', 'ACL'],
    locales: ['en-us'],
    contentTypes: ['helloworld'], // list to contentType entries to be updated
    environments: ['test'], // list of environments where it needs to be published
    defaults: {
      number: null,
      boolean: false,
      isodate: [],
      file: null,
      reference: [],
    },
  },
  bulkPublish: true,

}  
```
**Start publishing**

```sh
$ npm run add_fields
```

#### Case 9) Restore/unpublish entries published through script using logs
##### In this case, the published entries will be reverted back to their previous state.

**Start publishing**

```sh
$ npm run revert ${logFilename}
```
**logFilename is success logs of particular execution** 

**For example npm run revert 1587270350288.bulkPublishEntries.success**

#### Retrying failed Entries 
Entries which failed to publish are stored in logs directory with unique name ending with .error. In order to retry entries of those log file, you need execute same script with **retryFailed** flag along with **${logFilename}** which follows after it
```sh
$ npm run publish_entries -- -retryFailed ${logFilename} 
$ npm run publish_assets -- -retryFailed ${logFilename} 

```
for example
//npm run publish_entries -- -retryFailed 18003bulkPublishEntries.error


#### Known Limitations:

##### Case 1:NA
##### Case 2:NA
##### Case 3:
- For less publish failure of entries we recommend you to try one content type at a time
##### Case 4:NA
##### Case 5:NA
##### Case 6:NA
##### Case 7:NA
##### Case 8:
- Does not work on custom fields
- Does not work on mandatory fields
##### Case 9:
- To publish to a specific version we are using single entry/asset publish api instead of bulkpublish

