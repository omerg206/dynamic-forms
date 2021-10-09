import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormsTypeSchema, FormPropertiesFromServer, SchemasList, SelectionOption, ServerFormDetailsResponse, ServerFromDetailsSchemaPropValue, SubmitDataToServer, AllInputFieldDefaultOptions, DefaultFormFiledOptions } from '../types/dynamic-forms.types';
import { first, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { FormlyFieldConfig, FormlyTemplateOptions } from '@ngx-formly/core';



@Injectable()
export class DynamicFormsService {
  ///links should be in config/env file and read using config service?
  private serverBaseUrl = 'https://clarityapi.intelligo.ai/api/v1/schemas'
  private formsTypesUrl = '/list';
  private formsSubmitUrl = '/submit';

  private defaultFormsFieldsOptions: AllInputFieldDefaultOptions = {
    String: { type: 'input', templateOptions: {} },
    Date: { type: 'datepicker', templateOptions: { readonly: true, label: 'MM/DD/YY' } },
    Enum: { type: 'select', templateOptions: {} },
    Boolean: { type: 'checkbox', templateOptions: {} },
  }


  constructor(private http: HttpClient) {

  }


  submitFormToServer(model: any): Observable<any> {
    const { formType, ...fromData } = model;
    const dataToServer: SubmitDataToServer = { type: formType.value, form: fromData };

    return this.http.post<any>(this.serverBaseUrl + this.formsSubmitUrl, dataToServer).pipe(
      first(),
      map((response: any) => {
        debugger
        return 4
      }))

  }



  getFormsTypesFromServer(): Observable<SelectionOption[]> {
    return this.http.get<FormsTypeSchema>(this.serverBaseUrl + this.formsTypesUrl).pipe(
      first(),
      map((response: FormsTypeSchema) => {
        return response.result.schemasList.map((fromType: SchemasList) => this.createSelectionObject(fromType.display))
      }))

  }


  getFormDetails(formType: string): Observable<FormlyFieldConfig[]> {
    return this.http.get<ServerFormDetailsResponse>(this.serverBaseUrl + `/${formType}`).pipe(first(),
      map((response: ServerFormDetailsResponse) => {
        return this.parseFromDetailsResFormServer(response.result.scheme);
      }))
  }



  createFormTypesFiled(propName: string, onFormTypeChangeCb: any): FormlyFieldConfig {
    const fieldOptions: DefaultFormFiledOptions = {
      type: 'select', templateOptions: {
        required: true,
        readonly: true, valueProp: (option: any) => option.value,
        change: onFormTypeChangeCb, label: 'Forms types',
        options: this.getFormsTypesFromServer()
      }
    }

    return this.createFormFiled(propName, fieldOptions);
  }


  /**
   * server options will take precedence over default from field options
   */
  private createFormFiled(propName: string, defaultsFiledOptions: DefaultFormFiledOptions): FormlyFieldConfig {
    const normalizePropName = this.normalizeStrings(propName);
    return {
      key: propName,
      type: defaultsFiledOptions.type,
      templateOptions: {
        label: normalizePropName,
        description: normalizePropName,
        indeterminate: false,    // angular martial  checkbox  defaults as indeterminate
        ...defaultsFiledOptions.templateOptions,
      }
    }
  }


  /**
   * maybe the recursive function should be promised based in case the object is deeply nested.
   *  maybe the function should be irritative
   */
  private parseFromDetailsResFormServer(scheme: ServerFromDetailsSchemaPropValue, parsedDetails: FormlyFieldConfig[] = []): FormlyFieldConfig[] {
    for (const property in scheme) {
      if (this.isNestedFormDetails(scheme[property])) {
        const nestedFiled: FormlyFieldConfig = this.createNestedFormFields(property);
        parsedDetails.push(nestedFiled)
        this.parseFromDetailsResFormServer(scheme[property] as ServerFromDetailsSchemaPropValue, nestedFiled.fieldGroup)
      }
      else if (this.isStringifyFieldDetails(scheme[property])) {
        const formDetails: FormlyFieldConfig = this.createFormlyFieldConfigFormServerSchema(property, scheme[property] as string);
        parsedDetails.push(formDetails);
      }
      else {
        throw Error(`a non supported field type was received for the server: type ${typeof scheme[property]} property ${property}`)
      }

    }
    return parsedDetails;
  }

  // there is probably a better way for this check (instanceOf or another typescript way)
  private isNestedFormDetails(propValue: string | Object) {
    return typeof propValue === 'object';
  }


  private isStringifyFieldDetails(propValue: string | Object) {
    return typeof propValue === 'string';
  }


  private createNestedFormFields(propName: string): FormlyFieldConfig {
    return {
      key: propName,
      wrappers: ['panel'],
      templateOptions: { label: propName },
      fieldGroup: [],
    }
  }


  private createFormlyFieldConfigFormServerSchema(propName: string, propValue: string): FormlyFieldConfig {
    const parsedFiledDetails: FormPropertiesFromServer = JSON.parse(propValue as string);

    if (!this.defaultFormsFieldsOptions[parsedFiledDetails.type]) {
      throw Error(`non supported form filed type ${parsedFiledDetails.type}`)
    }

    const defaultOption: DefaultFormFiledOptions = {
      type: this.defaultFormsFieldsOptions[parsedFiledDetails.type].type,
      templateOptions: {
        ...this.defaultFormsFieldsOptions[parsedFiledDetails.type].templateOptions,
        ...this.convertServerFromOptionsToClientFormOptions(parsedFiledDetails)
      }
    }

    return this.createFormFiled(propName, defaultOption);
  }


  private convertServerFromOptionsToClientFormOptions(parsedFiledDetails: FormPropertiesFromServer): FormlyTemplateOptions {
    return {
      required: !!parsedFiledDetails.require,
      value: parsedFiledDetails.value,
      options: this.convertServerEnumValuesToSelectionOptions((parsedFiledDetails as any).enumValues)
    }
  }

  private convertServerEnumValuesToSelectionOptions(enumValues: string[] | undefined): SelectionOption[] {
    return enumValues ? enumValues.map((value: string) => this.createSelectionObject(value)) : [];
  }

  private createSelectionObject(value: string): SelectionOption {
    const normalizedValue = this.normalizeStrings(value)
    return { value: normalizedValue, label: normalizedValue }
  }

  /** remove _ , septate words, capitalize only first word
   * this could probably be improved and used with angular pipes or css
  */
  private normalizeStrings(stringToNormalize: string): string {
    let normalizeString: string = stringToNormalize;
    normalizeString = normalizeString.replace('_', ' ');
    const stringSplitByCapitalLetter = normalizeString.match(/[A-Z]*[^A-Z]+/g);
    normalizeString = stringSplitByCapitalLetter ? stringSplitByCapitalLetter.join(" ") : normalizeString

    return normalizeString.toLocaleLowerCase();

  }
}

