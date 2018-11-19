import { Component, OnInit, OnDestroy } from '@angular/core';
import * as ec_access from "../common/ec_access";
import { System } from "../common/system";
import { Observable, timer } from 'rxjs'
import { readFanTables, FanTable } from '../common/fanTable';
import { Environment } from '../common/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy
{
    public modelName: string;
    public fanTableInformation: string;
    public gpuInformations: string;
    public informations: string = "--";

    public cpuTemp: number = 0;
    public cpuFanDuty: number = 0;
    public cpuFanRpm: number = 0;

    public gpuTemp: number = 0;
    public gpuFanDuty: number = 0;
    public gpuFanRpm: number = 0;

    public canCpuDutyChange: boolean = true;
    public canGpuDutyChange: boolean = true;

    private _fanTable: FanTable;

    public isDaemonRunning: boolean = false;
    public isUserRoot: boolean = true;

    public canCreateUnitFile: boolean = true;
    public canInteractWithUnitFile: boolean = true;
    public expertMode: boolean = false;

    private _updateValuesWorker: any;

    ngOnInit(): void
    {
        if(!Environment.getObject("isUserRoot"))
        {
            this.informations = "User is not root, please restart with root privileges";
            this.canInteractWithUnitFile = this.canCreateUnitFile = this.isUserRoot = false;
            return;
        }

        this.expertMode = Environment.getObject("exportMode");

        System.logMessage("AppComponent - ngOnInit - Setup logic");

        this.modelName = System.getDmiModelName();
        this.setValues();
        this._updateValuesWorker = timer(1000, 1000);
        this._updateValuesWorker.subscribe(x => this.setValues());

        this._fanTable = readFanTables().find(x => x.model === this.modelName || x.model === "XXALLXX");

        if(this._fanTable !== undefined)
        {
            System.logMessage("AppComponent - ngOnInit - Fan Table found");
            this.fanTableInformation = "Fan Table found";
        }
        else
        {
            System.logMessage("AppComponent - ngOnInit - No Fan Table found");
            this.fanTableInformation = "No Fan Table found";
        }

        if(this._fanTable.hasGpu)
        {
            System.logMessage("AppComponent - ngOnInit - GPU Fan Table exist");
            this.gpuInformations = "GPU Fan Table exist";
        }
        else
        {
            System.logMessage("AppComponent - ngOnInit - NO GPU Fan Table exist");
            this.gpuInformations = "NO GPU Fan Table exist";
        }

        if(this._fanTable.hasGpu && !System.isNvidiaSmiInstalled())
        {
            System.logMessage("AppComponent - ngOnInit - NVIDIA SMI is missing");
            this.gpuInformations += ", NVIDIA SMI is missing";
        }
    }

    ngOnDestroy(): void
    {
        System.logMessage("AppComponent - ngOnDestroy - unsubscribe");
        this._updateValuesWorker.unsubscribe();
    }

    private setValues(): void
    {
        this.informations = "";
        this.isDaemonRunning = !(<any>window).require("../common/daemon").isDaemonRunning();

        this.canInteractWithUnitFile = System.existUnitFile() && this.isUserRoot;
        this.canCreateUnitFile = !this.canInteractWithUnitFile;

        this.canCpuDutyChange = this.canGpuDutyChange = this.isDaemonRunning;
        this.informations = !this.isDaemonRunning ? "Daemon is active" : "";

        this.cpuTemp = ec_access.getTempRemote(ec_access.FAN.CPUDATA);
        for(let i = 0; i < 100000; i++) {}
        this.cpuFanDuty = ec_access.getFanDuty(ec_access.FAN.CPUDATA);
        for(let i = 0; i < 100000; i++) {}
        this.cpuFanRpm = ec_access.getRpm(ec_access.FAN.CPUDATA);
        for(let i = 0; i < 100000; i++) {}

        if(this.cpuTemp >= 70)
        {
            if(this.informations === "")
            {
                this.informations += "High CPU Temerature";
            }
            else
            {
                this.informations += ", High CPU Temerature";
            }
        }

        if(System.isNvidiaSmiInstalled())
        {
            //this.gpuTemp = System.getNvidiaTemperature();
            let temP = ec_access.getTempRemote(ec_access.FAN.GPUONEDATA);
            for(let i = 0; i < 100000; i++) {}
            this.gpuTemp = temP;
            this.gpuFanDuty = ec_access.getFanDuty(ec_access.FAN.GPUONEDATA);
            for(let i = 0; i < 100000; i++) {}
            this.gpuFanRpm = ec_access.getRpm(ec_access.FAN.GPUONEDATA);
            for(let i = 0; i < 100000; i++) {}

            if(this.gpuTemp >= 70)
            {
                if(this.informations === "")
                {
                    this.informations += "High GPU Temerature";
                }
                else
                {
                    this.informations += ", High GPU Temerature";
                }
            }
        }
    }

    public setCpuFanDuty(valueString: string): void
    {
        System.logMessage("AppComponent - setCpuFanDuty - start");

        System.logMessage("AppComponent - setCpuFanDuty - parse value");
        let value: number = Number.parseInt(valueString);

        System.logMessage("AppComponent - setCpuFanDuty - set cpu fan duty on: " + value);
        if(value < 1 || value > 100)
        {
            System.logMessage("AppComponent - setCpuFanDuty - Invalid CPU Duty Speed! Possible values are between 1 and 100");
            this.informations = "Invalid CPU Duty Speed! Possible values are between 1 and 100";
            return;
        }

        try
        {
            System.logMessage("AppComponent - setCpuFanDuty - set cpu fan duty");
            let result = ec_access.setCpuFanDuty(value);
            System.logMessage("AppComponent - setCpuFanDuty - result: " + result);
        }
        catch (error)
        {
            System.logMessage("AppComponent - setCpuFanDuty - Error at setting CPU Fan Duty. " + error);
            this.informations = "Error at setting CPU Fan Duty. " + error;
        }
    }

    public setGpuFanDuty(valueString: string): void
    {
        System.logMessage("AppComponent - setGpuFanDuty - start");

        System.logMessage("AppComponent - setGpuFanDuty - parse value");
        let value: number = Number.parseInt(valueString);

        System.logMessage("AppComponent - setGpuFanDuty - set gpu fan duty on: " + value);

        if(value < 1 || value > 100)
        {
            System.logMessage("AppComponent - setGpuFanDuty - Invalid GPU Duty Speed! Possible values are between 1 and 100");
            this.informations = "Invalid GPU Duty Speed! Possible values are between 1 and 100";
            return;
        }

        try
        {
            System.logMessage("AppComponent - setGpuFanDuty - set cpu fan duty");
            let result = ec_access.setGpuFanDuty(value);
            System.logMessage("AppComponent - setGpuFanDuty - result: " + result);
        }
        catch (error)
        {
            System.logMessage("AppComponent - setGpuFanDuty - Error at setting GPU Fan Duty. " + error);
            this.informations = "Error at setting GPU Fan Duty. " + error;
        }
    }

    public openLink(url: string): void
    {
        (<any>window).require('electron').shell.openExternal(url);
    }

    public createUnitFile(): void
    {
        System.logMessage("AppComponent - createUnitFile");
        System.createUnitFile();
    }

    public removeUnitFile(): void
    {
        System.logMessage("AppComponent - removeUnitFile");
        System.removeUnitFile();
    }

    public startDaemon(): void
    {
        System.logMessage("AppComponent - startDaemon");
        System.startDaemon();
    }

    public stopDaemon(): void
    {
        System.logMessage("AppComponent - stopDaemon");
        System.stopDaemon();
    }

    public restartDaemon(): void
    {
        System.logMessage("AppComponent - restartDaemon");
        System.restartDaemon();
    }
}