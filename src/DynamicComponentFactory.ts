import {
    Component,
    Input,
    ComponentFactory,
    ComponentResolver,
    ElementRef,
    OnChanges,
    ViewContainerRef
} from '@angular/core';

import {
    Type,
    isPresent,
    isBlank,
    isArray
} from '@angular/core/src/facade/lang';

import {InputMetadata} from '@angular/core/src/metadata/directives';
import {Reflector} from '@angular/core/src/reflection/reflection';

import {BrowserDomAdapter}  from '@angular/platform-browser/src/browser/browser_adapter';

export class DynamicComponent {
    constructor(public selector:string = 'DynamicComponent', public template:string = '') {
    }
}

@Component(new DynamicComponent())
export class DynamicComponentFactory<TDynamicComponentType> implements OnChanges {

    @Input() componentType:{new ():TDynamicComponentType};
    @Input() componentTemplate:string;

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentResolver:ComponentResolver,
                protected reflector:Reflector) {
    }

    /**
     * @override
     */
    public ngOnChanges() {
        let componentType:Type = this.componentType;

        const componentTemplate:string = this.componentTemplate;

        if (!isBlank(componentTemplate)) {
            @Component(new DynamicComponent(null, componentTemplate))
            class TempComponent {
            }
            componentType = TempComponent;
        }

        this.componentResolver.resolveComponent(componentType)
            .then((componentFactory:ComponentFactory<TDynamicComponentType>) => {

                this.applyPropertiesToDynamicComponent(
                    this.viewContainer.createComponent<TDynamicComponentType>(componentFactory).instance
                );

                // Remove wrapper after render the component
                new BrowserDomAdapter().remove(this.element.nativeElement);
            });
    }

    private applyPropertiesToDynamicComponent(instance:TDynamicComponentType) {
        const placeholderComponentMetaData:{[key: string]: Type[];} = this.reflector.propMetadata(this.constructor),
            dynamicComponentMetaData:{[key: string]: Type[];} = this.reflector.propMetadata(instance.constructor);

        for (let prop of Object.keys(this)) {
            if (this.hasInputMetadataAnnotation(placeholderComponentMetaData[prop])
                && this.hasInputMetadataAnnotation(dynamicComponentMetaData[prop])) {

                if (isPresent(instance[prop])) {
                    console.warn('[$DynamicComponentFactory] The property', prop, 'will be overwritten for the component', instance);
                }
                instance[prop] = this[prop];
            }
        }
    }

    private hasInputMetadataAnnotation(metaDataByProperty:Array<Type>):boolean {
        return isArray(metaDataByProperty) && !!metaDataByProperty.find((decorator:Type) => decorator instanceof InputMetadata);
    }
}
