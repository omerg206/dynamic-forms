import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { DynamicFormsService } from './services/dynamic-forms.service';
import { SelectionOption } from './services/types/dynamic-forms.types';

@Component({
  selector: 'app-dynamic-forms',
  templateUrl: './dynamic-forms.component.html',
  styleUrls: ['./dynamic-forms.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicFormsComponent implements OnInit, OnDestroy {
  private onDestroy$: Subject<void> = new Subject();
  form: FormGroup = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {};
  selectionOptions: BehaviorSubject<SelectionOption[]> = new BehaviorSubject<SelectionOption[]>([]);

  fields: FormlyFieldConfig[] = [{
    key: 'FormsTypesSelection',
    type: 'select',
    focus: true,
    wrappers: ['panel'],
    templateOptions: {
      label: 'Forms types',
      required: true,
      readonly: true,
      options: this.selectionOptions,
      valueProp: (option: any) => option,
      // compareWith: (o1: any, o2: any) => o1.value === o2.value,
      change: this.onFormTypeChange.bind(this)

    }
  }]


  constructor(private dynamicFormsService: DynamicFormsService, private cd: ChangeDetectorRef) { }


  ngOnInit(): void {
    this.dynamicFormsService.getFormsTypesFromServer().pipe(
      takeUntil(this.onDestroy$)).subscribe((options: SelectionOption[]) => {
        this.selectionOptions.next(options);
      })
  }


  onFormTypeChange(model: any, { value }: any) {

    this.dynamicFormsService.getFormDetails(value.value).subscribe()
  }


  submit() {
    alert(JSON.stringify(this.model));
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

}
